import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * GET /api/proveedor/pagos
 * Obtiene los pagos recibidos del proveedor autenticado desde los ERPs
 *
 * Este endpoint:
 * 1. Obtiene los mappings del proveedor desde portal_proveedor_mapping
 * 2. Busca los pagos en cada ERP (tabla CxP - Cuentas por Pagar)
 * 3. Retorna todos los pagos consolidados de todas las empresas
 *
 * Query params:
 * - empresa?: string (filtrar por empresa específica)
 * - limite?: number (límite de pagos por empresa, default: 100)
 * - fechaDesde?: string (filtrar desde fecha YYYY-MM-DD)
 * - fechaHasta?: string (filtrar hasta fecha YYYY-MM-DD)
 * - estatus?: string (filtrar por estatus: PENDIENTE, CONCLUIDO, etc.)
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
    const limite = parseInt(searchParams.get('limite') || '100');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const estatusFiltro = searchParams.get('estatus');

    const userId = session.user.id;

    console.log(`\n💰 Obteniendo pagos para usuario: ${userId}`);

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
        pagos: [],
        totalPagos: 0,
      });
    }

    console.log(`✅ Encontrados ${mappingsResult.recordset.length} mappings`);

    // 2. Obtener pagos de cada empresa
    const todosLosPagos: any[] = [];
    const resumenPorEmpresa: Record<string, any> = {};

    for (const mapping of mappingsResult.recordset) {
      const { erp_proveedor_code, empresa_code } = mapping;

      try {
        console.log(`\n📍 Buscando pagos en ${empresa_code} para proveedor ${erp_proveedor_code}...`);

        const pool = await getERPConnection(empresa_code);

        // Construir filtros
        let filtroFecha = '';
        if (fechaDesde && fechaHasta) {
          filtroFecha = `AND FechaEmision BETWEEN '${fechaDesde}' AND '${fechaHasta}'`;
        } else if (fechaDesde) {
          filtroFecha = `AND FechaEmision >= '${fechaDesde}'`;
        } else if (fechaHasta) {
          filtroFecha = `AND FechaEmision <= '${fechaHasta}'`;
        }

        let filtroEstatus = '';
        if (estatusFiltro) {
          filtroEstatus = `AND Estatus = '${estatusFiltro}'`;
        }

        // Intentar obtener pagos de la tabla CxP (Cuentas por Pagar)
        // Esta es la tabla más común en Intelisis para pagos a proveedores
        // Usamos solo columnas comunes que existen en todas las versiones
        const pagosResult = await pool.request().query(`
          SELECT TOP ${limite}
            ID,
            Mov AS Folio,
            MovID,
            Empresa,
            Proveedor AS CodigoProveedor,
            FechaEmision,
            Importe,
            Impuestos,
            (Importe + Impuestos) AS Total,
            Saldo,
            Moneda,
            TipoCambio,
            Estatus,
            Referencia,
            Observaciones
          FROM CxP
          WHERE Proveedor = '${erp_proveedor_code}'
            ${filtroFecha}
            ${filtroEstatus}
          ORDER BY FechaEmision DESC
        `);

        const pagos = pagosResult.recordset.map(pago => ({
          ...pago,
          Empresa: empresa_code,
          EmpresaNombre: empresa_code === 'la-cantera' ? 'La Cantera' :
                         empresa_code === 'peralillo' ? 'Peralillo' :
                         empresa_code === 'plaza-galerena' ? 'Plaza Galereña' :
                         empresa_code === 'inmobiliaria-galerena' ? 'Inmobiliaria Galereña' :
                         empresa_code === 'icrear' ? 'Icrear' : empresa_code,
          MontoPagado: (pago.Total || 0) - (pago.Saldo || 0),
          PorcentajePagado: pago.Total > 0 ? (((pago.Total - pago.Saldo) / pago.Total) * 100).toFixed(2) : 0,
        }));

        todosLosPagos.push(...pagos);

        const totalPagado = pagos.reduce((sum, p) => sum + (p.MontoPagado || 0), 0);
        const saldoPendiente = pagos.reduce((sum, p) => sum + (p.Saldo || 0), 0);

        resumenPorEmpresa[empresa_code] = {
          codigoProveedor: erp_proveedor_code,
          totalPagos: pagos.length,
          montoTotal: pagos.reduce((sum, p) => sum + (p.Total || 0), 0),
          totalPagado,
          saldoPendiente,
        };

        console.log(`✅ Encontrados ${pagos.length} pagos en ${empresa_code}`);

      } catch (error: any) {
        console.error(`❌ Error obteniendo pagos de ${empresa_code}:`, error.message);

        // Si la tabla CxP no existe, intentar con otras tablas comunes
        if (error.message.includes('Invalid object name')) {
          console.log(`⚠️  Tabla CxP no existe en ${empresa_code}, intentando con otras tablas...`);

          resumenPorEmpresa[empresa_code] = {
            codigoProveedor: erp_proveedor_code,
            error: 'Tabla de pagos no encontrada en este ERP',
            mensaje: 'Contacta al administrador para configurar la tabla de pagos',
          };
        } else {
          resumenPorEmpresa[empresa_code] = {
            codigoProveedor: erp_proveedor_code,
            error: error.message,
          };
        }
      }
    }

    // 3. Ordenar todos los pagos por fecha (más recientes primero)
    todosLosPagos.sort((a, b) => {
      const fechaA = new Date(a.FechaEmision).getTime();
      const fechaB = new Date(b.FechaEmision).getTime();
      return fechaB - fechaA;
    });

    // 4. Calcular resumen global
    const resumenGlobal = {
      totalPagos: todosLosPagos.length,
      montoTotal: todosLosPagos.reduce((sum, p) => sum + (p.Total || 0), 0),
      totalPagado: todosLosPagos.reduce((sum, p) => sum + (p.MontoPagado || 0), 0),
      saldoPendiente: todosLosPagos.reduce((sum, p) => sum + (p.Saldo || 0), 0),
    };

    return NextResponse.json({
      success: true,
      userId,
      totalPagos: todosLosPagos.length,
      totalEmpresas: Object.keys(resumenPorEmpresa).length,
      resumenGlobal,
      resumenPorEmpresa,
      pagos: todosLosPagos,
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo pagos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener pagos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
