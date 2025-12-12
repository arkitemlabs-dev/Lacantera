import { NextRequest, NextResponse } from 'next/server';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * GET /api/proveedor/notificaciones
 * Obtiene las notificaciones del proveedor autenticado
 *
 * Query params:
 * - limite?: number (límite de notificaciones, default: 50)
 * - soloNoLeidas?: boolean (solo mostrar no leídas, default: false)
 * - tipo?: string (filtrar por tipo: NUEVA_ORDEN, PAGO_RECIBIDO, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limite = parseInt(searchParams.get('limite') || '50');
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';
    const tipoFiltro = searchParams.get('tipo');

    const userId = session.user.id;

    console.log(`\n🔔 Obteniendo notificaciones para usuario: ${userId}`);

    const portalPool = await getPortalConnection();

    // Construir filtros
    let filtros = 'WHERE portal_user_id = @userId';
    if (soloNoLeidas) {
      filtros += ' AND leida = 0';
    }
    if (tipoFiltro) {
      filtros += ` AND tipo = '${tipoFiltro}'`;
    }

    // Obtener notificaciones
    const result = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT TOP ${limite}
          id,
          tipo,
          titulo,
          mensaje,
          empresa_code,
          referencia_id,
          referencia_tipo,
          leida,
          fecha_leida,
          prioridad,
          metadata,
          created_at
        FROM proveedor_notificaciones
        ${filtros}
        ORDER BY
          CASE WHEN leida = 0 THEN 0 ELSE 1 END,
          CASE prioridad
            WHEN 'URGENTE' THEN 1
            WHEN 'ALTA' THEN 2
            WHEN 'NORMAL' THEN 3
            WHEN 'BAJA' THEN 4
            ELSE 5
          END,
          created_at DESC
      `);

    // Contar no leídas
    const countResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT COUNT(*) as total
        FROM proveedor_notificaciones
        WHERE portal_user_id = @userId
          AND leida = 0
      `);

    const totalNoLeidas = countResult.recordset[0].total;

    console.log(`✅ ${result.recordset.length} notificaciones encontradas (${totalNoLeidas} no leídas)`);

    return NextResponse.json({
      success: true,
      userId,
      totalNotificaciones: result.recordset.length,
      totalNoLeidas,
      notificaciones: result.recordset,
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo notificaciones:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener notificaciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proveedor/notificaciones
 * Crea una nueva notificación (uso interno del sistema)
 *
 * Body:
 * {
 *   userId: string,
 *   tipo: string,
 *   titulo: string,
 *   mensaje?: string,
 *   empresaCode?: string,
 *   referenciaId?: string,
 *   referenciaTipo?: string,
 *   prioridad?: string,
 *   metadata?: object
 * }
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

    const body = await request.json();
    const {
      userId,
      tipo,
      titulo,
      mensaje = '',
      empresaCode = null,
      referenciaId = null,
      referenciaTipo = null,
      prioridad = 'NORMAL',
      metadata = null,
    } = body;

    if (!userId || !tipo || !titulo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: userId, tipo, titulo' },
        { status: 400 }
      );
    }

    console.log(`\n🔔 Creando notificación para usuario: ${userId}`);

    const portalPool = await getPortalConnection();

    await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('tipo', sql.NVarChar(50), tipo)
      .input('titulo', sql.NVarChar(200), titulo)
      .input('mensaje', sql.NVarChar(sql.MAX), mensaje)
      .input('empresaCode', sql.VarChar(50), empresaCode)
      .input('referenciaId', sql.NVarChar(50), referenciaId)
      .input('referenciaTipo', sql.NVarChar(50), referenciaTipo)
      .input('prioridad', sql.VarChar(20), prioridad)
      .input('metadata', sql.NVarChar(sql.MAX), metadata ? JSON.stringify(metadata) : null)
      .query(`
        INSERT INTO proveedor_notificaciones (
          id,
          portal_user_id,
          tipo,
          titulo,
          mensaje,
          empresa_code,
          referencia_id,
          referencia_tipo,
          prioridad,
          metadata,
          created_at
        ) VALUES (
          NEWID(),
          @userId,
          @tipo,
          @titulo,
          @mensaje,
          @empresaCode,
          @referenciaId,
          @referenciaTipo,
          @prioridad,
          @metadata,
          GETDATE()
        )
      `);

    console.log(`✅ Notificación creada: ${tipo} - ${titulo}`);

    return NextResponse.json({
      success: true,
      message: 'Notificación creada exitosamente',
    });

  } catch (error: any) {
    console.error('[API] Error creando notificación:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear notificación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
