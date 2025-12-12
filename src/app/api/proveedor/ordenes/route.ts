import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * GET /api/proveedor/ordenes
 * Obtiene las órdenes de compra del proveedor autenticado desde los ERPs
 *
 * Este endpoint:
 * 1. Obtiene los mappings del proveedor desde portal_proveedor_mapping
 * 2. Busca las órdenes en cada ERP usando el código del proveedor
 * 3. Retorna todas las órdenes consolidadas de todas las empresas
 *
 * Query params:
 * - empresa?: string (filtrar por empresa específica: la-cantera, peralillo, plaza-galerena)
 * - limite?: number (límite de órdenes por empresa, default: 50)
 * - fechaDesde?: string (filtrar desde fecha YYYY-MM-DD)
 * - fechaHasta?: string (filtrar hasta fecha YYYY-MM-DD)
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
    const empresaFiltro = searchParams.get('empresa');
    const limite = parseInt(searchParams.get('limite') || '50');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');

    const userId = session.user.id;

    console.log(`\n🔍 Obteniendo órdenes para usuario: ${userId}`);

    // 1. Obtener mappings del proveedor desde el portal
    const portalPool = await getPortalConnection();
    const mappingsResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .query(`
        SELECT
          erp_proveedor_code,
          empresa_code,
          permisos
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND activo = 1
        ${empresaFiltro ? "AND empresa_code = '" + empresaFiltro + "'" : ''}
      `);

    if (mappingsResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se encontraron empresas asociadas a este proveedor',
        ordenes: [],
        totalOrdenes: 0,
      });
    }

    console.log(`✅ Encontrados ${mappingsResult.recordset.length} mappings`);

    // 2. Obtener órdenes de cada empresa
    const todasLasOrdenes: any[] = [];
    const resumenPorEmpresa: Record<string, any> = {};

    for (const mapping of mappingsResult.recordset) {
      const { erp_proveedor_code, empresa_code } = mapping;

      try {
        console.log(`\n📍 Buscando órdenes en ${empresa_code} para proveedor ${erp_proveedor_code}...`);

        const pool = await getERPConnection(empresa_code);

        // Construir filtros de fecha
        let filtroFecha = '';
        if (fechaDesde && fechaHasta) {
          filtroFecha = `AND FechaEmision BETWEEN '${fechaDesde}' AND '${fechaHasta}'`;
        } else if (fechaDesde) {
          filtroFecha = `AND FechaEmision >= '${fechaDesde}'`;
        } else if (fechaHasta) {
          filtroFecha = `AND FechaEmision <= '${fechaHasta}'`;
        }

        // Obtener órdenes de compra de la tabla Compra
        const ordenesResult = await pool.request().query(`
          SELECT TOP ${limite}
            ID,
            Mov AS Folio,
            Empresa,
            Proveedor AS CodigoProveedor,
            FechaEmision,
            Importe AS Subtotal,
            Impuestos,
            (Importe + Impuestos) AS Total,
            Moneda,
            Estatus,
            Condicion,
            Observaciones,
            Usuario,
            FechaRequerida
          FROM Compra
          WHERE Proveedor = '${erp_proveedor_code}'
            ${filtroFecha}
          ORDER BY FechaEmision DESC
        `);

        const ordenes = ordenesResult.recordset.map(orden => ({
          ...orden,
          Empresa: empresa_code,
          EmpresaNombre: empresa_code === 'la-cantera' ? 'La Cantera' :
                         empresa_code === 'peralillo' ? 'Peralillo' :
                         empresa_code === 'plaza-galerena' ? 'Plaza Galereña' : empresa_code,
        }));

        todasLasOrdenes.push(...ordenes);

        resumenPorEmpresa[empresa_code] = {
          codigoProveedor: erp_proveedor_code,
          totalOrdenes: ordenes.length,
          montoTotal: ordenes.reduce((sum, o) => sum + (o.Total || 0), 0),
        };

        console.log(`✅ Encontradas ${ordenes.length} órdenes en ${empresa_code}`);

      } catch (error: any) {
        console.error(`❌ Error obteniendo órdenes de ${empresa_code}:`, error.message);
        resumenPorEmpresa[empresa_code] = {
          codigoProveedor: erp_proveedor_code,
          error: error.message,
        };
      }
    }

    // 3. Ordenar todas las órdenes por fecha (más recientes primero)
    todasLasOrdenes.sort((a, b) => {
      const fechaA = new Date(a.FechaEmision).getTime();
      const fechaB = new Date(b.FechaEmision).getTime();
      return fechaB - fechaA;
    });

    return NextResponse.json({
      success: true,
      userId,
      totalOrdenes: todasLasOrdenes.length,
      totalEmpresas: Object.keys(resumenPorEmpresa).length,
      resumenPorEmpresa,
      ordenes: todasLasOrdenes,
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo órdenes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
