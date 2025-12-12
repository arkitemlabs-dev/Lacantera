import { NextRequest, NextResponse } from 'next/server';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * PATCH /api/proveedor/notificaciones/[id]
 * Marca una notificación como leída
 *
 * Params:
 * - id: ID de la notificación
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const notificacionId = params.id;
    const userId = session.user.id;

    console.log(`\n✅ Marcando notificación ${notificacionId} como leída`);

    const portalPool = await getPortalConnection();

    // Verificar que la notificación pertenece al usuario
    const checkResult = await portalPool.request()
      .input('id', sql.UniqueIdentifier, notificacionId)
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT id, leida
        FROM proveedor_notificaciones
        WHERE id = @id
          AND portal_user_id = @userId
      `);

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      );
    }

    const notificacion = checkResult.recordset[0];

    if (notificacion.leida) {
      return NextResponse.json({
        success: true,
        message: 'Notificación ya estaba marcada como leída',
        yaLeida: true,
      });
    }

    // Marcar como leída
    await portalPool.request()
      .input('id', sql.UniqueIdentifier, notificacionId)
      .query(`
        UPDATE proveedor_notificaciones
        SET leida = 1,
            fecha_leida = GETDATE()
        WHERE id = @id
      `);

    console.log(`✅ Notificación marcada como leída`);

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída',
    });

  } catch (error: any) {
    console.error('[API] Error marcando notificación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proveedor/notificaciones/[id]
 * Elimina una notificación
 *
 * Params:
 * - id: ID de la notificación
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const notificacionId = params.id;
    const userId = session.user.id;

    console.log(`\n🗑️  Eliminando notificación ${notificacionId}`);

    const portalPool = await getPortalConnection();

    // Eliminar notificación (solo si pertenece al usuario)
    const result = await portalPool.request()
      .input('id', sql.UniqueIdentifier, notificacionId)
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        DELETE FROM proveedor_notificaciones
        WHERE id = @id
          AND portal_user_id = @userId
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ Notificación eliminada`);

    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada',
    });

  } catch (error: any) {
    console.error('[API] Error eliminando notificación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
