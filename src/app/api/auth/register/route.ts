// src/app/api/auth/register/route.ts
// API endpoint para registro de proveedores y administradores

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import { ERP_DATABASES, validateEmpresaCode } from '@/lib/database/tenant-configs';
import { sendEmail } from '@/lib/email-service';
import { getWelcomeEmail } from '@/lib/email-templates/proveedor';
import { getNotificacionSistemaEmail } from '@/lib/email-templates/notificacion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, rfc, razonSocial, rol, telefono, empresaCode } = body;

    // Validaciones
    if (!email || !password || !nombre || !rfc) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const esAdmin = rol && (rol === 'super-admin' || rol === 'admin');

    // ── REGISTRO DE ADMINISTRADOR ──
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
          .input('empresa', sql.VarChar(2), '01') // Por defecto a 01 para admins
          .query(`
            INSERT INTO WebUsuario (UsuarioWeb, Nombre, eMail, Contrasena, Rol, Estatus, Alta, Empresa, Telefono)
            VALUES (@usuarioWeb, @nombre, @email, @contrasena, @rol, 'ACTIVO', GETDATE(), @empresa, @telefono)
          `);

        await transaction.commit();
        return NextResponse.json({ success: true, message: 'Administrador creado', userId: usuarioWebCode }, { status: 201 });
      } catch (error: any) {
        await transaction.rollback();
        console.error('[REGISTRO] Error admin:', error);
        return NextResponse.json({ error: 'Error al registrar administrador' }, { status: 500 });
      }
    }

    // ── REGISTRO DE PROVEEDOR ──
    console.log('[REGISTRO] Registrando proveedor:', email, 'empresa:', empresaCode);

    if (!empresaCode) {
      return NextResponse.json({ error: 'Debe seleccionar una empresa' }, { status: 400 });
    }

    let numericCode: string;
    try {
      numericCode = validateEmpresaCode(empresaCode);
    } catch {
      return NextResponse.json({ error: 'Empresa no válida' }, { status: 400 });
    }

    const dbConfig = ERP_DATABASES[numericCode];

    // 1. Buscar RFC en ERP
    const erpPool = await getERPConnection(numericCode);
    const rfcResult = await erpPool
      .request()
      .input('rfc', sql.VarChar(15), rfc)
      .query('SELECT TOP 1 Proveedor, Nombre, RFC FROM Prov WHERE RFC = @rfc');

    if (rfcResult.recordset.length === 0) {
      return NextResponse.json(
        { error: `El RFC ${rfc} no se encontró en ${dbConfig.nombre}.` },
        { status: 404 }
      );
    }

    const proveedorERP = rfcResult.recordset[0];
    const proveedorCodigo = proveedorERP.Proveedor;

    // 2. Transacción en Portal
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

      // Verificar vinculación previa
      const yaVinculado = await transaction
        .request()
        .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
        .input('empresaCode', sql.VarChar(10), numericCode)
        .query('SELECT id FROM portal_proveedor_mapping WHERE erp_proveedor_code = @proveedorCode AND empresa_code = @empresaCode AND activo = 1');

      if (yaVinculado.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json({ error: 'Este proveedor ya tiene cuenta en esta empresa' }, { status: 409 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const usuarioWebCode = `PROV${Date.now().toString().slice(-8)}`;

      // Insertar WebUsuario (Fuente de Verdad)
      await transaction
        .request()
        .input('usuarioWeb', sql.VarChar(50), usuarioWebCode)
        .input('nombre', sql.VarChar(100), nombre)
        .input('email', sql.VarChar(100), email)
        .input('contrasena', sql.VarChar(255), passwordHash)
        .input('proveedor', sql.VarChar(50), proveedorCodigo)
        .input('empresa', sql.VarChar(2), numericCode)
        .query(`
          INSERT INTO WebUsuario (UsuarioWeb, Nombre, eMail, Contrasena, Rol, Estatus, Alta, Proveedor, Empresa)
          VALUES (@usuarioWeb, @nombre, @email, @contrasena, 'proveedor', 'ACTIVO', GETDATE(), @proveedor, @empresa)
        `);

      // Insertar Mapping (Multi-tenant)
      await transaction
        .request()
        .input('userId', sql.VarChar(50), usuarioWebCode)
        .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
        .input('empresaCode', sql.VarChar(2), numericCode)
        .query(`
          INSERT INTO portal_proveedor_mapping (id, portal_user_id, erp_proveedor_code, empresa_code, activo, created_at)
          VALUES (NEWID(), @userId, @proveedorCode, @empresaCode, 1, GETDATE())
        `);

      await transaction.commit();

      // Email (opcional, no bloqueante)
      try {
        await sendEmail({
          to: email,
          subject: 'Bienvenido al Portal de Proveedores',
          html: getWelcomeEmail({
            nombreProveedor: razonSocial,
            nombreContacto: nombre, 
            email,
            empresaCliente: dbConfig.nombre,
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
          })
        });
      } catch (e) {
        console.warn('Email no enviado:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'Registro exitoso',
        userId: usuarioWebCode,
        empresaCode: numericCode
      }, { status: 201 });

    } catch (error: any) {
      await transaction.rollback();
      throw error;
    }
  } catch (error: any) {
    console.error('Error registro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
