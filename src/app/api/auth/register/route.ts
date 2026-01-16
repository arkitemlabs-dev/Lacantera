// src/app/api/auth/register/route.ts
// API endpoint para registro de proveedores y administradores

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getConnection } from '@/lib/sql-connection';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { autoSyncProveedorByRFC } from '@/lib/services/auto-sync-proveedor';
import { sendEmail } from '@/lib/email-service';
import { getWelcomeEmail } from '@/lib/email-templates/proveedor';
import { getNotificacionSistemaEmail } from '@/lib/email-templates/notificacion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, rfc, razonSocial, rol, telefono, datosAdicionales } = body;

    // Validaciones
    if (!email || !password || !nombre || !rfc) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Determinar si es registro de admin o proveedor
    const esAdmin = rol && (rol === 'super-admin' || rol === 'admin');

    // Si es admin, usar WebUsuario
    if (esAdmin) {
      console.log('🔧 [REGISTRO] Registrando administrador en WebUsuario');

      const portalPool = await getPortalConnection();
      const transaction = portalPool.transaction();

      try {
        await transaction.begin();

        // 1. Verificar que el email no esté registrado en WebUsuario
        const existingEmail = await transaction
          .request()
          .input('email', sql.VarChar(100), email)
          .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email');

        if (existingEmail.recordset.length > 0) {
          await transaction.rollback();
          return NextResponse.json(
            { error: 'Este email ya está registrado' },
            { status: 409 }
          );
        }

        // 2. Crear hash de contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // 3. Generar código único para UsuarioWeb
        const usuarioWebCode = `ADMIN${Date.now().toString().slice(-6)}`;

        // 4. Crear usuario administrador en WebUsuario
        await transaction
          .request()
          .input('usuarioWeb', sql.VarChar(50), usuarioWebCode)
          .input('nombre', sql.VarChar(100), nombre)
          .input('email', sql.VarChar(100), email)
          .input('contrasena', sql.VarChar(255), passwordHash)
          .input('rol', sql.VarChar(50), rol)
          .input('telefono', sql.VarChar(50), telefono || null)
          .input('empresa', sql.VarChar(50), razonSocial || null)
          .query(`
            INSERT INTO WebUsuario (
              UsuarioWeb,
              Nombre,
              eMail,
              Contrasena,
              Rol,
              Estatus,
              Alta,
              UltimoCambio,
              Telefono,
              Empresa
            )
            VALUES (
              @usuarioWeb,
              @nombre,
              @email,
              @contrasena,
              @rol,
              'ACTIVO',
              GETDATE(),
              GETDATE(),
              @telefono,
              @empresa
            )
          `);

        await transaction.commit();

        console.log(`✅ [REGISTRO] Administrador creado: ${email} (Usuario: ${usuarioWebCode})`);

        // Enviar email de bienvenida al administrador
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const welcomeHtml = getNotificacionSistemaEmail({
            nombreUsuario: nombre,
            tipo: 'success',
            titulo: 'Bienvenido al Portal de Proveedores',
            mensaje: `Tu cuenta de administrador ha sido creada exitosamente. Ya puedes acceder al sistema con tu email: ${email}`,
            accionTexto: 'Iniciar Sesion',
            accionUrl: `${baseUrl}/login`,
            fecha: new Date()
          });

          await sendEmail({
            to: email,
            subject: 'Bienvenido al Portal de Proveedores - La Cantera',
            html: welcomeHtml
          });

          console.log(`📧 Email de bienvenida enviado a admin: ${email}`);
        } catch (emailError: any) {
          console.error('⚠️ Error enviando email de bienvenida (no critico):', emailError.message);
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Registro de administrador exitoso.',
            usuarioWeb: usuarioWebCode,
            rol: rol
          },
          { status: 201 }
        );
      } catch (error: any) {
        await transaction.rollback();
        console.error('❌ [REGISTRO] Error en transacción de admin:', error);

        // Verificar si es un error de violación de restricción única
        if (error.number === 2627 || error.number === 2601) {
          return NextResponse.json(
            { error: 'Ya existe un registro con estos datos' },
            { status: 409 }
          );
        }

        throw error;
      }
    }

    // Si es proveedor, usar el flujo existente
    console.log('🔧 [REGISTRO] Registrando proveedor en pNetUsuario');

    // Validar RFC (formato básico) - solo para proveedores
    if (rfc.length < 12 || rfc.length > 13) {
      return NextResponse.json(
        { error: 'RFC inválido (debe tener 12 o 13 caracteres)' },
        { status: 400 }
      );
    }

    if (!razonSocial) {
      return NextResponse.json(
        { error: 'La razón social es requerida para proveedores' },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      // 1. Verificar que el email no esté registrado
      const existingEmail = await transaction
        .request()
        .input('email', sql.VarChar(50), email)
        .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

      if (existingEmail.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json(
          { error: 'Este email ya está registrado' },
          { status: 409 }
        );
      }

      // 2. Verificar que el RFC no esté registrado en Prov
      const existingRFC = await transaction
        .request()
        .input('rfc', sql.VarChar(15), rfc)
        .query('SELECT Proveedor FROM Prov WHERE RFC = @rfc');

      if (existingRFC.recordset.length > 0) {
        await transaction.rollback();
        return NextResponse.json(
          {
            error:
              'Este RFC ya está registrado. Si ya eres proveedor, contacta al administrador.',
          },
          { status: 409 }
        );
      }

      // 3. Generar código único para el proveedor (formato: PROV + número secuencial)
      const lastProvResult = await transaction.request().query(`
        SELECT TOP 1 Proveedor
        FROM Prov
        WHERE Proveedor LIKE 'PROV%'
        ORDER BY Proveedor DESC
      `);

      let proveedorCodigo = 'PROV001';
      if (lastProvResult.recordset.length > 0) {
        const lastCode = lastProvResult.recordset[0].Proveedor;
        const lastNumber = parseInt(lastCode.replace('PROV', ''));
        const nextNumber = lastNumber + 1;
        proveedorCodigo = `PROV${String(nextNumber).padStart(3, '0')}`;
      }

      // 4. Crear registro en tabla Prov
      await transaction
        .request()
        .input('proveedor', sql.VarChar(10), proveedorCodigo)
        .input('nombre', sql.VarChar(100), razonSocial)
        .input('rfc', sql.VarChar(15), rfc)
        .input('estatus', sql.VarChar(15), 'BAJA') // Inicia como BAJA hasta que sea aprobado
        .query(`
          INSERT INTO Prov (Proveedor, Nombre, RFC, Estatus)
          VALUES (@proveedor, @nombre, @rfc, @estatus)
        `);

      // 5. Crear usuario en pNetUsuario
      const userResult = await transaction
        .request()
        .input('usuario', sql.VarChar(10), proveedorCodigo)
        .input('idUsuarioTipo', sql.Int, 4) // Tipo 4 = Proveedor
        .input('email', sql.VarChar(50), email)
        .input('nombreUsuario', sql.VarChar(100), nombre)
        .input('estatus', sql.VarChar(15), 'ACTIVO')
        .query(`
          INSERT INTO pNetUsuario (
            Usuario, IDUsuarioTipo, eMail, Nombre,
            Estatus, FechaRegistro, PrimeraVez
          )
          OUTPUT INSERTED.IDUsuario
          VALUES (
            @usuario, @idUsuarioTipo, @email, @nombreUsuario,
            @estatus, GETDATE(), 1
          )
        `);

      const userId = userResult.recordset[0].IDUsuario;

      // 6. Crear hash de contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // 7. Guardar contraseña
      await transaction
        .request()
        .input('userId', sql.Int, userId)
        .input('hash', sql.VarChar(255), passwordHash)
        .query(`
          INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)
          VALUES (@userId, @hash)
        `);

      await transaction.commit();

      // 8. AUTO-SINCRONIZACIÓN: Buscar al proveedor en todos los ERPs
      console.log(`🔄 Iniciando auto-sincronización para RFC: ${rfc}`);
      let syncResult = null;

      try {
        syncResult = await autoSyncProveedorByRFC(String(userId), rfc);
        console.log(`✅ Auto-sync completado: ${syncResult.mappingsCreados} mappings creados en ${syncResult.empresasEncontradas.length} empresas`);
      } catch (syncError: any) {
        console.error('⚠️ Error en auto-sincronización (no crítico):', syncError.message);
        // No fallar el registro si falla la sincronización
      }

      // Enviar email de bienvenida al proveedor
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const welcomeHtml = getWelcomeEmail({
          nombreProveedor: razonSocial,
          nombreContacto: nombre,
          email: email,
          empresaCliente: 'La Cantera',
          loginUrl: `${baseUrl}/login`
        });

        await sendEmail({
          to: email,
          subject: 'Bienvenido al Portal de Proveedores - La Cantera',
          html: welcomeHtml
        });

        console.log(`📧 Email de bienvenida enviado a proveedor: ${email}`);
      } catch (emailError: any) {
        console.error('⚠️ Error enviando email de bienvenida (no critico):', emailError.message);
      }

      return NextResponse.json(
        {
          success: true,
          message:
            'Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.',
          userId: String(userId),
          proveedorCodigo,
          autoSync: syncResult ? {
            empresasEncontradas: syncResult.empresasEncontradas,
            mappingsCreados: syncResult.mappingsCreados,
            detalles: syncResult.detalles
          } : null
        },
        { status: 201 }
      );
    } catch (error: any) {
      await transaction.rollback();
      console.error('Error en transacción de registro:', error);

      // Verificar si es un error de violación de restricción única
      if (error.number === 2627 || error.number === 2601) {
        return NextResponse.json(
          { error: 'Ya existe un registro con estos datos' },
          { status: 409 }
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el registro. Por favor intenta de nuevo.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
