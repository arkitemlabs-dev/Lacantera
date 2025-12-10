import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { extendedDb } from '@/lib/database/sqlserver-extended';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/notificaciones
 * Obtiene notificaciones del usuario para la empresa actual
 *
 * Query params:
 * - noLeidas: boolean (solo mostrar no leídas)
 */
export const GET = withTenantContext(async (request, { tenant, user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const soloNoLeidas = searchParams.get('noLeidas') === 'true';

    // Convertir user.id (string) a número
    const idUsuario = parseInt(user.id);

    if (isNaN(idUsuario)) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de usuario inválido'
        },
        { status: 400 }
      );
    }

    // Obtener notificaciones filtradas por usuario y empresa actual
    const notificaciones = await extendedDb.getNotificacionesUsuario(
      idUsuario,
      tenant.empresaCodigo // Usa el código de empresa del tenant actual
    );

    // Filtrar solo no leídas si se solicita
    const resultado = soloNoLeidas
      ? notificaciones.filter(n => !n.leida)
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
 *
 * Body:
 * {
 *   usuario: number (IDUsuario destino),
 *   usuarioNombre: string,
 *   tipo: string,
 *   titulo: string,
 *   mensaje: string,
 *   link?: string,
 *   datosJSON?: any,
 *   prioridad?: 'baja' | 'normal' | 'alta'
 * }
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
    if (!usuario || !usuarioNombre || !tipo || !titulo || !mensaje) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos incompletos. Se requiere: usuario, usuarioNombre, tipo, titulo, mensaje'
        },
        { status: 400 }
      );
    }

    // Crear notificación asociada a la empresa actual del tenant
    const notificacionID = await extendedDb.createNotificacion({
      notificacionID: uuidv4(),
      idUsuario: parseInt(usuario),
      usuarioNombre,
      empresa: tenant.empresaCodigo, // Usa la empresa actual del tenant
      tipo,
      titulo,
      mensaje,
      link,
      datosJSON,
      leida: false,
      emailEnviado: false,
      prioridad: prioridad || 'normal',
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
 *
 * Body:
 * {
 *   notificacionID: string
 * }
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

    // TODO: Validar que la notificación pertenezca al usuario actual
    // antes de marcarla como leída
    await extendedDb.marcarNotificacionLeida(notificacionID);

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
