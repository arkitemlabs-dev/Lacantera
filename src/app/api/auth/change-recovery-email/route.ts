// src/app/api/auth/change-recovery-email/route.ts
// API para solicitar cambio de email de recuperación con confirmación

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';
import crypto from 'crypto';
import { getConnection } from '@/lib/sql-connection';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { sendEmail } from '@/lib/email-service';
import { getNotificacionSistemaEmail } from '@/lib/email-templates/notificacion';

const TOKEN_EXPIRATION_MINUTES = 30; // Token válido por 30 minutos

// POST - Solicitar cambio de email de recuperación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { nuevoEmail } = body;

    if (!nuevoEmail) {
      return NextResponse.json(
        { error: 'El nuevo email es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoEmail)) {
      return NextResponse.json(
        { error: 'Formato de email invalido' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const emailActual = session.user.email;
    const nombreUsuario = session.user.name || 'Usuario';
    const tipoUsuario = session.user.role === 'proveedor' ? 'proveedor' : 'admin';

    console.log(`📧 [CHANGE-EMAIL] Solicitud de ${emailActual} -> ${nuevoEmail}`);

    // Obtener IP del cliente
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'Desconocida';

    const portalPool = await getPortalConnection();

    // Verificar que el nuevo email no esté ya registrado
    // Buscar en pNetUsuario
    const pool = await getConnection();
    const existingProveedor = await pool.request()
      .input('email', sql.VarChar(100), nuevoEmail)
      .query(`SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email`);

    if (existingProveedor.recordset.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya esta registrado en el sistema' },
        { status: 409 }
      );
    }

    // Buscar en WebUsuario
    const existingAdmin = await portalPool.request()
      .input('email', sql.VarChar(100), nuevoEmail)
      .query(`SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email`);

    if (existingAdmin.recordset.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya esta registrado en el sistema' },
        { status: 409 }
      );
    }

    // Generar token de confirmación
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    // Invalidar tokens anteriores para este usuario
    await portalPool.request()
      .input('userId', sql.VarChar(50), userId)
      .query(`
        UPDATE EmailChangeTokens
        SET Confirmado = 1
        WHERE UserId = @userId AND Confirmado = 0
      `);

    // Crear nuevo token
    await portalPool.request()
      .input('userId', sql.VarChar(50), userId)
      .input('tipoUsuario', sql.VarChar(20), tipoUsuario)
      .input('emailActual', sql.VarChar(100), emailActual)
      .input('emailNuevo', sql.VarChar(100), nuevoEmail)
      .input('tokenHash', sql.VarChar(255), tokenHash)
      .input('expiresAt', sql.DateTime, expiresAt)
      .input('ipAddress', sql.VarChar(50), ipAddress)
      .query(`
        INSERT INTO EmailChangeTokens (UserId, TipoUsuario, EmailActual, EmailNuevo, TokenHash, ExpiresAt, IPAddress, Confirmado, CreatedAt)
        VALUES (@userId, @tipoUsuario, @emailActual, @emailNuevo, @tokenHash, @expiresAt, @ipAddress, 0, GETDATE())
      `);

    // Construir URL de confirmación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/auth/confirm-email-change?token=${token}`;

    // Enviar email de confirmación al NUEVO email
    const emailHtml = getNotificacionSistemaEmail({
      nombreUsuario: nombreUsuario,
      tipo: 'warning',
      titulo: 'Confirma tu nuevo email de recuperacion',
      mensaje: `Has solicitado cambiar tu email de recuperacion a esta direccion. Haz clic en el boton para confirmar el cambio. Este enlace expira en ${TOKEN_EXPIRATION_MINUTES} minutos.`,
      accionTexto: 'Confirmar Email',
      accionUrl: confirmUrl,
      fecha: new Date()
    });

    const emailResult = await sendEmail({
      to: nuevoEmail,
      subject: 'Confirma tu nuevo email de recuperacion - Portal de Proveedores',
      html: emailHtml
    });

    if (!emailResult.success) {
      console.error('Error enviando email de confirmacion:', emailResult.error);
      return NextResponse.json(
        { error: 'Error al enviar el email de confirmacion' },
        { status: 500 }
      );
    }

    console.log(`📧 Email de confirmacion enviado a: ${nuevoEmail}`);

    return NextResponse.json({
      success: true,
      message: `Se ha enviado un email de confirmacion a ${nuevoEmail}. Por favor revisa tu bandeja de entrada.`
    });

  } catch (error: any) {
    console.error('❌ [CHANGE-EMAIL] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
