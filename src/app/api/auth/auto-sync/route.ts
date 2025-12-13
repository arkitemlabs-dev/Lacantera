import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { autoSyncProveedorByRFC, getEmpresasDisponibles } from '@/lib/services/auto-sync-proveedor';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * POST /api/auth/auto-sync
 *
 * Sincroniza automáticamente un proveedor buscándolo en todos los ERPs por RFC
 *
 * Body:
 * {
 *   "userId": "123", // Opcional, si no se proporciona usa el de la sesión
 *   "rfc": "ACE140813E29" // Opcional, si no se proporciona lo busca del usuario
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [POST /api/auth/auto-sync] Iniciando...');

    const body = await request.json();
    let { userId, rfc } = body;

    // Si no se proporciona userId, usar el de la sesión
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json(
          { success: false, error: 'No autenticado' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    console.log(`📍 Usuario: ${userId}`);

    // Si no se proporciona RFC, buscarlo del usuario/proveedor
    if (!rfc) {
      const portalPool = await getPortalConnection();

      // Buscar RFC del proveedor asociado al usuario
      const rfcResult = await portalPool.request()
        .input('userId', sql.NVarChar(50), userId)
        .query(`
          SELECT p.RFC
          FROM pNetUsuario u
          LEFT JOIN Prov p ON u.Usuario = p.Proveedor
          WHERE u.IDUsuario = CAST(@userId AS INT)
        `);

      if (!rfcResult.recordset || rfcResult.recordset.length === 0 || !rfcResult.recordset[0].RFC) {
        return NextResponse.json({
          success: false,
          error: 'No se encontró RFC asociado al usuario'
        }, { status: 404 });
      }

      rfc = rfcResult.recordset[0].RFC;
      console.log(`📍 RFC encontrado: ${rfc}`);
    }

    // Validar RFC
    if (!rfc || rfc.length < 12 || rfc.length > 13) {
      return NextResponse.json({
        success: false,
        error: 'RFC inválido'
      }, { status: 400 });
    }

    // Ejecutar sincronización
    const syncResult = await autoSyncProveedorByRFC(userId, rfc);

    if (!syncResult.success) {
      return NextResponse.json({
        success: false,
        message: 'No se encontró el proveedor en ningún ERP',
        empresasEncontradas: syncResult.empresasEncontradas,
        errores: syncResult.errores
      }, { status: 404 });
    }

    // Obtener empresas disponibles después de la sincronización
    const empresasDisponibles = await getEmpresasDisponibles(userId);

    console.log(`✅ Sincronización completada: ${syncResult.mappingsCreados} mappings creados`);

    return NextResponse.json({
      success: true,
      message: `Sincronización completada exitosamente`,
      userId,
      rfc,
      empresasEncontradas: syncResult.empresasEncontradas.length,
      mappingsCreados: syncResult.mappingsCreados,
      detalles: syncResult.detalles,
      empresasDisponibles,
      errores: syncResult.errores
    });

  } catch (error: any) {
    console.error('❌ [POST /api/auth/auto-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en sincronización automática',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * GET /api/auth/auto-sync
 *
 * Obtiene el estado de sincronización del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/auth/auto-sync] Verificando estado...');

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Obtener empresas disponibles
    const empresasDisponibles = await getEmpresasDisponibles(userId);

    // Obtener RFC del usuario
    const portalPool = await getPortalConnection();
    const rfcResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT p.RFC, p.Nombre
        FROM pNetUsuario u
        LEFT JOIN Prov p ON u.Usuario = p.Proveedor
        WHERE u.IDUsuario = CAST(@userId AS INT)
      `);

    const rfc = rfcResult.recordset[0]?.RFC;
    const nombre = rfcResult.recordset[0]?.Nombre;

    return NextResponse.json({
      success: true,
      userId,
      rfc,
      nombre,
      empresasDisponibles,
      totalEmpresas: empresasDisponibles.length,
      sincronizado: empresasDisponibles.length > 0
    });

  } catch (error: any) {
    console.error('❌ [GET /api/auth/auto-sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado de sincronización',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
