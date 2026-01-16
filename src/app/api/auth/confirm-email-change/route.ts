// src/app/api/auth/confirm-email-change/route.ts
// API para confirmar cambio de email de recuperación

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import crypto from 'crypto';
import { getConnection } from '@/lib/sql-connection';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { sendEmail } from '@/lib/email-service';
import { getNotificacionSistemaEmail } from '@/lib/email-templates/notificacion';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return redirectWithMessage('error', 'Token no proporcionado');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const portalPool = await getPortalConnection();

    // Buscar token válido
    const tokenResult = await portalPool.request()
      .input('tokenHash', sql.VarChar(255), tokenHash)
      .query(`
        SELECT ID, UserId, TipoUsuario, EmailActual, EmailNuevo, ExpiresAt, Confirmado
        FROM EmailChangeTokens
        WHERE TokenHash = @tokenHash AND Confirmado = 0
      `);

    if (tokenResult.recordset.length === 0) {
      return redirectWithMessage('error', 'El enlace es invalido o ya fue utilizado');
    }

    const tokenData = tokenResult.recordset[0];

    // Verificar expiración
    if (new Date(tokenData.ExpiresAt) < new Date()) {
      return redirectWithMessage('error', 'El enlace ha expirado. Solicita uno nuevo');
    }

    const { UserId, TipoUsuario, EmailActual, EmailNuevo } = tokenData;

    // Actualizar email según tipo de usuario
    if (TipoUsuario === 'proveedor') {
      const pool = await getConnection();
      await pool.request()
        .input('userId', sql.Int, parseInt(UserId))
        .input('nuevoEmail', sql.VarChar(100), EmailNuevo)
        .query(`
          UPDATE pNetUsuario
          SET eMail = @nuevoEmail, UltimoCambio = GETDATE()
          WHERE IDUsuario = @userId
        `);

      console.log(`✅ Email actualizado para proveedor ${UserId}: ${EmailActual} -> ${EmailNuevo}`);

    } else if (TipoUsuario === 'admin') {
      await portalPool.request()
        .input('emailActual', sql.VarChar(100), EmailActual)
        .input('nuevoEmail', sql.VarChar(100), EmailNuevo)
        .query(`
          UPDATE WebUsuario
          SET eMail = @nuevoEmail, UltimoCambio = GETDATE()
          WHERE eMail = @emailActual
        `);

      console.log(`✅ Email actualizado para admin: ${EmailActual} -> ${EmailNuevo}`);
    }

    // Marcar token como usado
    await portalPool.request()
      .input('tokenId', sql.Int, tokenData.ID)
      .query(`
        UPDATE EmailChangeTokens
        SET Confirmado = 1, ConfirmadoAt = GETDATE()
        WHERE ID = @tokenId
      `);

    // Enviar notificación al email ANTIGUO
    const notificationHtml = getNotificacionSistemaEmail({
      nombreUsuario: 'Usuario',
      tipo: 'info',
      titulo: 'Tu email de recuperacion ha sido actualizado',
      mensaje: `Tu email de recuperacion ha sido cambiado exitosamente de ${EmailActual} a ${EmailNuevo}. Si no realizaste este cambio, contacta a soporte inmediatamente.`,
      fecha: new Date()
    });

    await sendEmail({
      to: EmailActual,
      subject: 'Email de recuperacion actualizado - Portal de Proveedores',
      html: notificationHtml
    });

    return redirectWithMessage('success', 'Tu email de recuperacion ha sido actualizado exitosamente');

  } catch (error: any) {
    console.error('❌ [CONFIRM-EMAIL-CHANGE] Error:', error);
    return redirectWithMessage('error', 'Error al procesar la solicitud');
  }
}

function redirectWithMessage(type: 'success' | 'error', message: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUrl = type === 'success'
    ? `${baseUrl}/proveedores/seguridad?email_changed=true`
    : `${baseUrl}/proveedores/seguridad?email_error=${encodeURIComponent(message)}`;

  return NextResponse.redirect(redirectUrl);
}
