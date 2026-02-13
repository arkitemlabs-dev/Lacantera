import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { database } from '@/lib/database';

/**
 * GET /api/notificaciones
 * Obtiene notificaciones del usuario para la empresa actual
 */
export const GET = withTenantContext(async (request, { tenant, user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const soloNoLeidas = searchParams.get('noLeidas') === 'true';

    const usuarioId = String(user.id);

    // Obtener notificaciones de WebNotificacion
    const notificaciones = await database.getNotificacionesByUsuario(usuarioId);

    // Filtrar solo no leídas si se solicita
    const resultado = soloNoLeidas
      ? notificaciones.filter((n: any) => !n.leida)
      : notificaciones;

    return NextResponse.json({
      success: true,
      notificaciones: resultado,
      total: resultado.length,
      tenant: {
        empresa: tenant.tenantName,
        codigo: tenant.empresaCodigo
      }
    });
  } catch (error: any) {
    console.error('[API] Error al obtener notificaciones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/notificaciones
 * Crear una nueva notificación para la empresa actual
 */
export const POST = withTenantContext(async (request, { tenant, user }) => {
  try {
    const body = await request.json();
    const {
      usuario,
      usuarioNombre,
      tipo,
      titulo,
      mensaje,
      link,
      datosJSON,
      prioridad,
    } = body;

    // Validaciones
    if (!usuario || !tipo || !titulo || !mensaje) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos incompletos. Se requiere: usuario, tipo, titulo, mensaje'
        },
        { status: 400 }
      );
    }

    // Crear notificación en WebNotificacion
    const notificacionID = await database.createNotificacion({
      usuarioId: String(usuario),
      tipo,
      titulo,
      mensaje,
      link,
      leida: false,
      emailEnviado: false,
      empresaId: tenant.empresaCodigo
    });

    return NextResponse.json({
      success: true,
      notificacionID,
      message: 'Notificación creada exitosamente',
      tenant: {
        empresa: tenant.tenantName,
        codigo: tenant.empresaCodigo
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error al crear notificación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/notificaciones
 * Marcar notificación como leída
 */
export const PATCH = withTenantContext(async (request, { tenant, user }) => {
  try {
    const body = await request.json();
    const { notificacionID } = body;

    if (!notificacionID) {
      return NextResponse.json(
        {
          success: false,
          error: 'notificacionID es requerido'
        },
        { status: 400 }
      );
    }

    await database.marcarNotificacionComoLeida(notificacionID);

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída'
    });
  } catch (error: any) {
    console.error('[API] Error al marcar notificación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});
