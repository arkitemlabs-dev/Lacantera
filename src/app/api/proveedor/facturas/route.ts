import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

/**
 * GET /api/proveedor/facturas
 *
 * Obtiene las facturas del proveedor desde las tablas Cxc de los ERPs
 * Consolidado de todas las empresas a las que tiene acceso el proveedor
 *
 * Query Parameters:
 * - empresa (opcional): Filtrar por empresa específica
 * - fecha_desde (opcional): YYYY-MM-DD
 * - fecha_hasta (opcional): YYYY-MM-DD
 * - estatus (opcional): CONCLUIDO, CANCELADO, PENDIENTE, etc.
 * - limite (opcional, default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/proveedor/facturas] Iniciando...');

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('📍 Usuario autenticado:', userId);

    // 2. Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const empresaFiltro = searchParams.get('empresa');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const estatusFiltro = searchParams.get('estatus');
    const limite = parseInt(searchParams.get('limite') || '50');

    console.log('📍 Parámetros:', { empresaFiltro, fechaDesde, fechaHasta, estatusFiltro, limite });

    // 3. Obtener mappings del portal
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
      `);

    if (!mappingsResult.recordset || mappingsResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron empresas asociadas a este proveedor'
      }, { status: 404 });
    }

    console.log(`✅ Mappings encontrados: ${mappingsResult.recordset.length}`);

    // 4. Filtrar por empresa si se especificó
    let mappings = mappingsResult.recordset;
    if (empresaFiltro) {
      mappings = mappings.filter(m => m.empresa_code === empresaFiltro);
      if (mappings.length === 0) {
        return NextResponse.json({
          success: false,
          error: `No tiene acceso a la empresa ${empresaFiltro}`
        }, { status: 403 });
      }
    }

    // 5. Consultar facturas de cada empresa
    const todasLasFacturas: any[] = [];
    const resumenPorEmpresa: any = {};

    for (const mapping of mappings) {
      const { erp_proveedor_code, empresa_code } = mapping;

      try {
        console.log(`🔍 Consultando facturas en ${empresa_code} para proveedor ${erp_proveedor_code}`);

        const pool = await getERPConnection(empresa_code);

        // Construir filtros dinámicos
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

        // Query a tabla Cxc (Cuentas por Cobrar)
        // Estructura basada en resultados de exploración:
        // ID, Empresa, Mov, MovID, FechaEmision, Moneda, Cliente, Importe, Impuestos, Saldo, Estatus, Referencia, etc.
        const facturasResult = await pool.request().query(`
          SELECT TOP ${limite}
            ID,
            Empresa,
            Mov AS Folio,
            MovID,
            FechaEmision,
            Moneda,
            TipoCambio,
            Cliente AS CodigoCliente,
            Importe AS Subtotal,
            Impuestos,
            (Importe + Impuestos) AS Total,
            Saldo,
            Estatus,
            Referencia,
            Observaciones,
            Vencimiento,
            FechaRegistro,
            FechaConclusion,
            FechaCancelacion,
            Usuario,
            Condicion,
            FormaCobro,
            Concepto,
            Proyecto
          FROM Cxc
          WHERE Cliente = '${erp_proveedor_code}'
            ${filtroFecha}
            ${filtroEstatus}
          ORDER BY FechaEmision DESC
        `);

        console.log(`✅ ${empresa_code}: ${facturasResult.recordset.length} facturas encontradas`);

        // Enriquecer datos con nombre de empresa
        const facturas = facturasResult.recordset.map(factura => ({
          ...factura,
          EmpresaCodigo: empresa_code,
          EmpresaNombre: empresa_code === 'la-cantera' ? 'La Cantera' :
                         empresa_code === 'peralillo' ? 'Peralillo' :
                         empresa_code === 'plaza-galerena' ? 'Plaza Galereña' :
                         empresa_code === 'inmobiliaria-galerena' ? 'Inmobiliaria Galereña' :
                         empresa_code === 'icrear' ? 'Icrear' : empresa_code,
          CodigoProveedor: erp_proveedor_code
        }));

        todasLasFacturas.push(...facturas);

        // Calcular resumen por empresa
        const totalFacturas = facturas.length;
        const montoTotal = facturas.reduce((sum, f) => sum + (parseFloat(f.Total) || 0), 0);
        const saldoTotal = facturas.reduce((sum, f) => sum + (parseFloat(f.Saldo) || 0), 0);

        resumenPorEmpresa[empresa_code] = {
          codigoProveedor: erp_proveedor_code,
          totalFacturas,
          montoTotal: montoTotal.toFixed(2),
          saldoTotal: saldoTotal.toFixed(2),
          montoMoneda: facturas[0]?.Moneda || 'MXN'
        };

      } catch (error: any) {
        console.error(`❌ Error consultando ${empresa_code}:`, error.message);
        resumenPorEmpresa[empresa_code] = {
          error: error.message,
          codigoProveedor: erp_proveedor_code
        };
      }
    }

    console.log('✅ Consulta completada');

    // 6. Retornar respuesta consolidada
    return NextResponse.json({
      success: true,
      userId,
      totalFacturas: todasLasFacturas.length,
      totalEmpresas: Object.keys(resumenPorEmpresa).length,
      filtros: {
        empresa: empresaFiltro,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        estatus: estatusFiltro,
        limite
      },
      resumenPorEmpresa,
      facturas: todasLasFacturas
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/facturas] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener facturas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
