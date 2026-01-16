// src/app/api/auth/forgot-password/route.ts
// API para solicitar recuperación de contraseña

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import crypto from 'crypto';
import { getConnection } from '@/lib/sql-connection';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { sendEmail } from '@/lib/email-service';
import { getRecuperarPasswordEmail } from '@/lib/email-templates/notificacion';

const TOKEN_EXPIRATION_MINUTES = 60; // Token válido por 60 minutos

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'El email es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    console.log(`🔑 [FORGOT-PASSWORD] Solicitud para: ${email}`);

    // Obtener IP del cliente para el email
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'Desconocida';

    // Buscar el usuario en ambas tablas (proveedores y admins)
    let usuario = null;
    let tipoUsuario: 'proveedor' | 'admin' = 'proveedor';

    // 1. Buscar en pNetUsuario (proveedores)
    const pool = await getConnection();
    const proveedorResult = await pool.request()
      .input('email', sql.VarChar(100), email)
      .query(`
        SELECT IDUsuario, Nombre, eMail, Estatus
        FROM pNetUsuario
        WHERE eMail = @email AND Estatus = 'ACTIVO'
      `);

    if (proveedorResult.recordset.length > 0) {
      usuario = proveedorResult.recordset[0];
      tipoUsuario = 'proveedor';
      console.log(`📍 Usuario encontrado en pNetUsuario: ${usuario.Nombre}`);
    }

    // 2. Si no está en proveedores, buscar en WebUsuario (admins)
    if (!usuario) {
      const portalPool = await getPortalConnection();
      const adminResult = await portalPool.request()
        .input('email', sql.VarChar(100), email)
        .query(`
          SELECT UsuarioWeb, Nombre, eMail, Estatus
          FROM WebUsuario
          WHERE eMail = @email AND Estatus = 'ACTIVO'
        `);

      if (adminResult.recordset.length > 0) {
        usuario = adminResult.recordset[0];
        tipoUsuario = 'admin';
        console.log(`📍 Usuario encontrado en WebUsuario: ${usuario.Nombre}`);
      }
    }

    // Si no se encuentra el usuario, responder con éxito para no revelar información
    // (seguridad: no indicar si el email existe o no)
    if (!usuario) {
      console.log(`⚠️ Email no encontrado: ${email} (respuesta genérica por seguridad)`);
      return NextResponse.json({
        success: true,
        message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    // Guardar token en la base de datos
    const portalPool = await getPortalConnection();

    // Primero, invalidar tokens anteriores para este email
    await portalPool.request()
      .input('email', sql.VarChar(100), email)
      .query(`
        UPDATE PasswordResetTokens
        SET Usado = 1
        WHERE Email = @email AND Usado = 0
      `);

    // Crear nuevo token
    await portalPool.request()
      .input('email', sql.VarChar(100), email)
      .input('tokenHash', sql.VarChar(255), tokenHash)
      .input('tipoUsuario', sql.VarChar(20), tipoUsuario)
      .input('expiresAt', sql.DateTime, expiresAt)
      .input('ipAddress', sql.VarChar(50), ipAddress)
      .query(`
        INSERT INTO PasswordResetTokens (Email, TokenHash, TipoUsuario, ExpiresAt, IPAddress, Usado, CreatedAt)
        VALUES (@email, @tokenHash, @tipoUsuario, @expiresAt, @ipAddress, 0, GETDATE())
      `);

    console.log(`✅ Token generado para ${email}, expira: ${expiresAt.toISOString()}`);

    // Construir URL de reset
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Generar contenido del email
    const emailHtml = getRecuperarPasswordEmail({
      nombreUsuario: usuario.Nombre,
      email: email,
      resetUrl: resetUrl,
      expiraEn: TOKEN_EXPIRATION_MINUTES,
      ipAddress: ipAddress
    });

    // Enviar email
    const emailResult = await sendEmail({
      to: email,
      subject: '🔑 Recuperación de Contraseña - Portal de Proveedores',
      html: emailHtml
    });

    if (!emailResult.success) {
      console.error('❌ Error enviando email de recuperación:', emailResult.error);
      // No revelar el error específico al usuario
      return NextResponse.json({
        success: true,
        message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    console.log(`📧 Email de recuperación enviado a ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
    });

  } catch (error: any) {
    console.error('❌ [FORGOT-PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
