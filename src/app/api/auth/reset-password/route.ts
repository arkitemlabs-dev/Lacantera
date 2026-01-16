// src/app/api/auth/reset-password/route.ts
// API para restablecer contraseña con token

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getConnection } from '@/lib/sql-connection';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { sendEmail } from '@/lib/email-service';
import { getCambioPasswordEmail } from '@/lib/email-templates/notificacion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    // Validaciones
    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    console.log(`🔐 [RESET-PASSWORD] Procesando reset para: ${email}`);

    // Obtener IP del cliente
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'Desconocida';

    // Hashear el token recibido para comparar con la BD
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token válido
    const portalPool = await getPortalConnection();
    const tokenResult = await portalPool.request()
      .input('email', sql.VarChar(100), email)
      .input('tokenHash', sql.VarChar(255), tokenHash)
      .query(`
        SELECT ID, Email, TipoUsuario, ExpiresAt, Usado
        FROM PasswordResetTokens
        WHERE Email = @email
          AND TokenHash = @tokenHash
          AND Usado = 0
      `);

    if (tokenResult.recordset.length === 0) {
      console.log(`⚠️ Token no encontrado o inválido para: ${email}`);
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado.' },
        { status: 400 }
      );
    }

    const tokenData = tokenResult.recordset[0];

    // Verificar si el token ha expirado
    if (new Date(tokenData.ExpiresAt) < new Date()) {
      console.log(`⚠️ Token expirado para: ${email}`);
      return NextResponse.json(
        { error: 'El enlace de recuperación ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // Crear hash de la nueva contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Actualizar contraseña según el tipo de usuario
    let nombreUsuario = '';

    if (tokenData.TipoUsuario === 'proveedor') {
      // Actualizar en pNetUsuario/pNetUsuarioPassword
      const pool = await getConnection();

      // Obtener datos del usuario
      const userResult = await pool.request()
        .input('email', sql.VarChar(100), email)
        .query(`
          SELECT IDUsuario, Nombre FROM pNetUsuario WHERE eMail = @email
        `);

      if (userResult.recordset.length === 0) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const userId = userResult.recordset[0].IDUsuario;
      nombreUsuario = userResult.recordset[0].Nombre;

      // Actualizar contraseña
      await pool.request()
        .input('userId', sql.Int, userId)
        .input('hash', sql.VarChar(255), passwordHash)
        .query(`
          UPDATE pNetUsuarioPassword
          SET PasswordHash = @hash, UltimoCambio = GETDATE()
          WHERE IDUsuario = @userId
        `);

      console.log(`✅ Contraseña actualizada para proveedor: ${email}`);

    } else if (tokenData.TipoUsuario === 'admin') {
      // Actualizar en WebUsuario
      const userResult = await portalPool.request()
        .input('email', sql.VarChar(100), email)
        .query(`
          SELECT UsuarioWeb, Nombre FROM WebUsuario WHERE eMail = @email
        `);

      if (userResult.recordset.length === 0) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      nombreUsuario = userResult.recordset[0].Nombre;

      await portalPool.request()
        .input('email', sql.VarChar(100), email)
        .input('hash', sql.VarChar(255), passwordHash)
        .query(`
          UPDATE WebUsuario
          SET Contrasena = @hash, UltimoCambio = GETDATE()
          WHERE eMail = @email
        `);

      console.log(`✅ Contraseña actualizada para admin: ${email}`);
    }

    // Marcar token como usado
    await portalPool.request()
      .input('tokenId', sql.Int, tokenData.ID)
      .input('ipAddress', sql.VarChar(50), ipAddress)
      .query(`
        UPDATE PasswordResetTokens
        SET Usado = 1, UsadoAt = GETDATE(), UsadoIP = @ipAddress
        WHERE ID = @tokenId
      `);

    // Enviar email de confirmación de cambio
    const emailHtml = getCambioPasswordEmail({
      nombreUsuario: nombreUsuario,
      email: email,
      fechaCambio: new Date(),
      ipAddress: ipAddress,
      soporte: process.env.SUPPORT_EMAIL || 'soporte@lacantera.com'
    });

    await sendEmail({
      to: email,
      subject: '🔐 Tu contraseña ha sido cambiada - Portal de Proveedores',
      html: emailHtml
    });

    console.log(`📧 Email de confirmación de cambio enviado a ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Tu contraseña ha sido actualizada exitosamente.'
    });

  } catch (error: any) {
    console.error('❌ [RESET-PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// GET para verificar si un token es válido (para la UI)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        { valid: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const portalPool = await getPortalConnection();
    const tokenResult = await portalPool.request()
      .input('email', sql.VarChar(100), email)
      .input('tokenHash', sql.VarChar(255), tokenHash)
      .query(`
        SELECT ExpiresAt, Usado
        FROM PasswordResetTokens
        WHERE Email = @email
          AND TokenHash = @tokenHash
          AND Usado = 0
      `);

    if (tokenResult.recordset.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'El enlace de recuperación es inválido.'
      });
    }

    const tokenData = tokenResult.recordset[0];

    if (new Date(tokenData.ExpiresAt) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'El enlace de recuperación ha expirado.'
      });
    }

    return NextResponse.json({
      valid: true,
      email: email
    });

  } catch (error: any) {
    console.error('❌ [RESET-PASSWORD GET] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Error al verificar el token' },
      { status: 500 }
    );
  }
}
