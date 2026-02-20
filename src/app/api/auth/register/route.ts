// src/app/api/auth/register/route.ts
// Registro de proveedores y administradores.
// Proveedores: sin empresaCode — el sistema determina todas las empresas del RFC
// via CNspEmpresasDelProveedor y crea mappings para todas ellas.

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import { ERP_DATABASES, validateEmpresaCode } from '@/lib/database/tenant-configs';
import { sendEmail } from '@/lib/email-service';
import { getWelcomeEmail } from '@/lib/email-templates/proveedor';

/** Mapea fila del SP a código portal. Misma lógica que /api/auth/empresas-proveedor */
function mapToPortalCode(row: any, ambiente: string): string | null {
  const isTest = ambiente === 'Pruebas';
  const allowedCodes = isTest
    ? ['06', '07', '08', '09', '10']
    : ['01', '02', '03', '04', '05'];

  const erpEmpresa = String(
    row.Empresa ?? row.EmpresaCodigo ?? row.IDEmpresa ?? row.CveEmpresa ?? ''
  ).trim();

  if (allowedCodes.includes(erpEmpresa)) return erpEmpresa;

  const dbName = String(row.BaseDatos ?? row.Database ?? row.NombreBase ?? '').trim();
  for (const code of allowedCodes) {
    const config = ERP_DATABASES[code];
    const empresaMatch = config.empresa === erpEmpresa;
    const dbMatch = !dbName || config.db.toLowerCase() === dbName.toLowerCase();
    if (empresaMatch && dbMatch) return code;
  }

  if (!dbName) {
    for (const code of allowedCodes) {
      if (ERP_DATABASES[code].empresa === erpEmpresa) return code;
    }
  }

  const nombre = String(row.NombreEmpresa ?? row.RazonSocial ?? row.Nombre ?? '').trim();
  if (nombre) {
    for (const code of allowedCodes) {
      if (ERP_DATABASES[code].nombre.toLowerCase() === nombre.toLowerCase()) return code;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, rfc, razonSocial, rol, telefono } = body;

    // Validaciones comunes
    if (!email || !password || !nombre) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const esAdmin = rol && (rol === 'super-admin' || rol === 'admin');

    // ── REGISTRO DE ADMINISTRADOR ──────────────────────────────────────────────
    if (esAdmin) {
      console.log('[REGISTRO] Registrando administrador:', email);
      const portalPool = await getPortalConnection();
      const transaction = portalPool.transaction();

      try {
        await transaction.begin();

        const existingEmail = await transaction
          .request()
          .input('email', sql.VarChar(100), email)
          .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email');

        if (existingEmail.recordset.length > 0) {
          await transaction.rollback();
          return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const usuarioWebCode = `ADMIN${Date.now().toString().slice(-6)}`;

        await transaction
          .request()
          .input('usuarioWeb', sql.VarChar(50), usuarioWebCode)
          .input('nombre', sql.VarChar(100), nombre)
          .input('email', sql.VarChar(100), email)
          .input('contrasena', sql.VarChar(255), passwordHash)
          .input('rol', sql.VarChar(50), rol)
          .input('telefono', sql.VarChar(50), telefono || null)
          .input('empresa', sql.VarChar(2), '01')
          .query(`
            INSERT INTO WebUsuario (UsuarioWeb, Nombre, eMail, Contrasena, Rol, Estatus, Alta, Empresa, Telefono)
            VALUES (@usuarioWeb, @nombre, @email, @contrasena, @rol, 'ACTIVO', GETDATE(), @empresa, @telefono)
          `);

        await transaction.commit();
        return NextResponse.json(
          { success: true, message: 'Administrador creado', userId: usuarioWebCode },
          { status: 201 }
        );
      } catch (error: any) {
        await transaction.rollback();
        console.error('[REGISTRO] Error admin:', error);
        return NextResponse.json({ error: 'Error al registrar administrador' }, { status: 500 });
      }
    }

    // ── REGISTRO DE PROVEEDOR ──────────────────────────────────────────────────
    if (!rfc) {
      return NextResponse.json({ error: 'El RFC es requerido' }, { status: 400 });
    }

    const rfcUpper = rfc.toUpperCase().trim();
    console.log('[REGISTRO] Registrando proveedor:', email, 'RFC:', rfcUpper);

    // 1. Obtener empresas del RFC via CNspEmpresasDelProveedor
    const erpPoolPrincipal = await getERPConnection('06');
    const spResult = await erpPoolPrincipal
      .request()
      .input('Rfc', sql.VarChar(20), rfcUpper)
      .input('Ambiente', sql.VarChar(20), 'Pruebas')
      .execute('CNspEmpresasDelProveedor');

    const spRows: any[] = spResult.recordset ?? [];

    if (spRows.length === 0) {
      return NextResponse.json(
        { error: `El RFC ${rfcUpper} no se encontró como proveedor en ninguna empresa.` },
        { status: 404 }
      );
    }

    // Mapear filas del SP a códigos portal
    const empresasMapeadas = spRows
      .map((row) => ({ row, codigoPortal: mapToPortalCode(row, 'Pruebas') }))
      .filter((x) => x.codigoPortal !== null) as { row: any; codigoPortal: string }[];

    if (empresasMapeadas.length === 0) {
      console.error('[REGISTRO] SP devolvió filas pero no se pudieron mapear:', spRows);
      return NextResponse.json(
        { error: 'No se pudo determinar las empresas del proveedor. Contacte al administrador.' },
        { status: 500 }
      );
    }

    // 2. Para cada empresa mapeada, obtener el código ERP del proveedor (Prov.Proveedor)
    interface EmpresaProveedor {
      codigoPortal: string;
      proveedorCodigo: string;
    }
    const empresasProveedor: EmpresaProveedor[] = [];

    for (const { codigoPortal } of empresasMapeadas) {
      try {
        const erpPool = await getERPConnection(codigoPortal);
        const provResult = await erpPool
          .request()
          .input('rfc', sql.VarChar(15), rfcUpper)
          .query('SELECT TOP 1 Proveedor FROM Prov WHERE RFC = @rfc');

        if (provResult.recordset.length > 0) {
          empresasProveedor.push({
            codigoPortal,
            proveedorCodigo: provResult.recordset[0].Proveedor,
          });
        } else {
          console.warn(
            `[REGISTRO] RFC ${rfcUpper} no encontrado en Prov de empresa ${codigoPortal}. Se omite.`
          );
        }
      } catch (err) {
        console.warn(`[REGISTRO] Error consultando empresa ${codigoPortal}:`, err);
      }
    }

    if (empresasProveedor.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró el RFC en las tablas de proveedores. Contacte al administrador.' },
        { status: 404 }
      );
    }

    const primeraEmpresa = empresasProveedor[0];

    // 3. Transacción en Portal: WebUsuario + mappings para todas las empresas
    const portalPool = await getPortalConnection();
    const transaction = portalPool.transaction();

    try {
      await transaction.begin();

      // Verificar email
      const existingEmail = await transaction
        .request()
        .input('email', sql.VarChar(100), email)
        .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email');

      if (existingEmail.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });
      }

      // Verificar si ya tiene cuenta en alguna de las empresas encontradas
      for (const { codigoPortal, proveedorCodigo } of empresasProveedor) {
        const yaVinculado = await transaction
          .request()
          .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
          .input('empresaCode', sql.VarChar(10), codigoPortal)
          .query(
            'SELECT id FROM portal_proveedor_mapping WHERE erp_proveedor_code = @proveedorCode AND empresa_code = @empresaCode AND activo = 1'
          );

        if (yaVinculado.recordset.length > 0) {
          await transaction.rollback();
          return NextResponse.json(
            {
              error: `Este proveedor ya tiene cuenta en la empresa ${ERP_DATABASES[codigoPortal]?.nombre || codigoPortal}.`,
            },
            { status: 409 }
          );
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const usuarioWebCode = `PROV${Date.now().toString().slice(-8)}`;

      // Insertar WebUsuario (empresa = primera empresa del proveedor)
      await transaction
        .request()
        .input('usuarioWeb', sql.VarChar(50), usuarioWebCode)
        .input('nombre', sql.VarChar(100), nombre)
        .input('email', sql.VarChar(100), email)
        .input('contrasena', sql.VarChar(255), passwordHash)
        .input('proveedor', sql.VarChar(50), primeraEmpresa.proveedorCodigo)
        .input('empresa', sql.VarChar(2), primeraEmpresa.codigoPortal)
        .query(`
          INSERT INTO WebUsuario (UsuarioWeb, Nombre, eMail, Contrasena, Rol, Estatus, Alta, Proveedor, Empresa)
          VALUES (@usuarioWeb, @nombre, @email, @contrasena, 'proveedor', 'ACTIVO', GETDATE(), @proveedor, @empresa)
        `);

      // Insertar mapping para CADA empresa
      for (const { codigoPortal, proveedorCodigo } of empresasProveedor) {
        await transaction
          .request()
          .input('userId', sql.VarChar(50), usuarioWebCode)
          .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
          .input('empresaCode', sql.VarChar(2), codigoPortal)
          .query(`
            INSERT INTO portal_proveedor_mapping (id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at)
            VALUES (NEWID(), @userId, @proveedorCode, @empresaCode, 1, GETDATE())
          `);
      }

      await transaction.commit();

      console.log(
        `[REGISTRO] Proveedor registrado: ${usuarioWebCode} con ${empresasProveedor.length} empresa(s)`
      );

      // Email de bienvenida (no bloqueante)
      try {
        const dbConfig = ERP_DATABASES[primeraEmpresa.codigoPortal];
        await sendEmail({
          to: email,
          subject: 'Bienvenido al Portal de Proveedores',
          html: getWelcomeEmail({
            nombreProveedor: razonSocial || nombre,
            nombreContacto: nombre,
            email,
            empresaCliente: dbConfig?.nombre || 'La Cantera',
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          }),
        });
      } catch (e) {
        console.warn('[REGISTRO] Email no enviado:', e);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Registro exitoso',
          userId: usuarioWebCode,
          primeraEmpresa: primeraEmpresa.codigoPortal,
          totalEmpresas: empresasProveedor.length,
        },
        { status: 201 }
      );
    } catch (error: any) {
      await transaction.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('[REGISTRO] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
