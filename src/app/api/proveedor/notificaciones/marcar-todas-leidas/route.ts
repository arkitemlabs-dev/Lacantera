import { NextRequest, NextResponse } from 'next/server';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * POST /api/proveedor/notificaciones/marcar-todas-leidas
 * Marca todas las notificaciones del usuario como leídas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`\n✅ Marcando todas las notificaciones como leídas para usuario: ${userId}`);

    const portalPool = await getPortalConnection();

    const result = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        UPDATE proveedor_notificaciones
        SET leida = 1,
            fecha_leida = GETDATE()
        WHERE portal_user_id = @userId
          AND leida = 0
      `);

    const totalMarcadas = result.rowsAffected[0];

    console.log(`✅ ${totalMarcadas} notificaciones marcadas como leídas`);

    return NextResponse.json({
      success: true,
      message: `${totalMarcadas} notificación(es) marcada(s) como leída(s)`,
      totalMarcadas,
    });

  } catch (error: any) {
    console.error('[API] Error marcando notificaciones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
