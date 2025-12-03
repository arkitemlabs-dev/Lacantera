import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, verifyEmailConnection } from '@/lib/helpers/email';

// POST - Enviar email de prueba
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'El campo "to" es requerido' },
        { status: 400 }
      );
    }

    // Verificar configuración SMTP
    const isConfigured =
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_HOST;

    if (!isConfigured) {
      return NextResponse.json(
        {
          error: 'Configuración SMTP incompleta',
          details:
            'Verifica que SMTP_USER, SMTP_PASSWORD y SMTP_HOST estén configurados en .env.local',
        },
        { status: 500 }
      );
    }

    // Verificar conexión
    console.log('[TEST-EMAIL] Verificando conexión SMTP...');
    const connectionOk = await verifyEmailConnection();

    if (!connectionOk) {
      return NextResponse.json(
        {
          error: 'Error de conexión SMTP',
          details: 'No se pudo conectar al servidor SMTP. Verifica las credenciales.',
        },
        { status: 500 }
      );
    }

    // Enviar email de prueba
    console.log(`[TEST-EMAIL] Enviando email de prueba a ${to}...`);
    const success = await sendEmail({
      to,
      subject: '🧪 Email de Prueba - La Cantera Portal',
      templateType: 'notificacion:sistema',
      templateData: {
        destinatarioNombre: session.user.name || 'Usuario',
        titulo: 'Email de Prueba',
        mensaje: `Este es un email de prueba del sistema de notificaciones de La Cantera.

Si recibes este email, significa que tu configuración SMTP está funcionando correctamente.

Información de la prueba:
- Enviado: ${new Date().toLocaleString('es-MX')}
- Usuario: ${session.user.name || 'Usuario'}
- Email: ${session.user.email || 'N/A'}

¡Todo está listo para enviar notificaciones automáticas! 🎉`,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Email de prueba enviado exitosamente a ${to}`,
        details: {
          from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
          to,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      return NextResponse.json(
        {
          error: 'Error al enviar email',
          details: 'El email no pudo ser enviado. Revisa los logs del servidor.',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[TEST-EMAIL] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al enviar email de prueba',
        details: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// GET - Verificar configuración SMTP
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isConfigured =
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.SMTP_HOST;

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'Configuración SMTP incompleta',
        missing: {
          SMTP_HOST: !process.env.SMTP_HOST,
          SMTP_USER: !process.env.SMTP_USER,
          SMTP_PASSWORD: !process.env.SMTP_PASSWORD,
        },
      });
    }

    // Verificar conexión
    const connectionOk = await verifyEmailConnection();

    return NextResponse.json({
      configured: true,
      connected: connectionOk,
      message: connectionOk
        ? 'Configuración SMTP correcta y conexión exitosa'
        : 'Configuración presente pero no se pudo conectar',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
    });
  } catch (error: any) {
    console.error('[TEST-EMAIL] Error verificando configuración:', error);
    return NextResponse.json(
      {
        error: 'Error al verificar configuración',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
