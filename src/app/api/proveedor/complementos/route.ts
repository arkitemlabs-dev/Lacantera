import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getNombreEmpresa } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * GET /api/proveedor/complementos
 *
 * Obtiene los complementos de pago del proveedor desde las tablas CFDI_Complementopago
 * Consolidado de todas las empresas a las que tiene acceso el proveedor
 *
 * Query Parameters:
 * - empresa (opcional): Filtrar por empresa específica
 * - fecha_desde (opcional): YYYY-MM-DD
 * - fecha_hasta (opcional): YYYY-MM-DD
 * - limite (opcional, default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/proveedor/complementos] Iniciando...');

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
    const limite = parseInt(searchParams.get('limite') || '50');

    console.log('📍 Parámetros:', { empresaFiltro, fechaDesde, fechaHasta, limite });

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

    // 5. Consultar complementos de cada empresa
    const todosLosComplementos: any[] = [];
    const resumenPorEmpresa: any = {};

    for (const mapping of mappings) {
      const { erp_proveedor_code, empresa_code } = mapping;

      try {
        console.log(`🔍 Consultando complementos en ${empresa_code} para proveedor ${erp_proveedor_code}`);

        const pool = await getERPConnection(empresa_code);

        // Construir filtros dinámicos
        let filtroFecha = '';
        if (fechaDesde && fechaHasta) {
          filtroFecha = `AND cp.FechaPago BETWEEN '${fechaDesde}' AND '${fechaHasta}'`;
        } else if (fechaDesde) {
          filtroFecha = `AND cp.FechaPago >= '${fechaDesde}'`;
        } else if (fechaHasta) {
          filtroFecha = `AND cp.FechaPago <= '${fechaHasta}'`;
        }

        // Query a tablas CFDI_Complementopago y CFDI_ComplementopagoD
        // Estructura basada en resultados de exploración:
        // CFDI_Complementopago: ID, UUID, FechaPago, FormaDePagoP, MonedaP, Monto
        // CFDI_ComplementopagoD: ID, UUID, IdDocumento, Folio, MonedaDR, MetodoDePagoDR, NumParcialidad, ImpSaldoAnt, ImpPagado, ImpSaldoInsoluto

        // Nota: No tenemos campo "Proveedor" en CFDI_Complementopago según la exploración
        // Vamos a obtener todos y luego filtrar por los UUIDs de documentos relacionados

        // Primero, obtener los UUIDs de facturas del proveedor desde Cxc
        const facturasUUIDResult = await pool.request()
          .input('proveedorCode', sql.VarChar(10), erp_proveedor_code)
          .query(`
            SELECT DISTINCT MovID
            FROM Cxc
            WHERE Cliente = @proveedorCode
          `);

        const facturasMovIDs = facturasUUIDResult.recordset.map(r => r.MovID);

        if (facturasMovIDs.length === 0) {
          console.log(`⚠️ ${empresa_code}: No hay facturas para este proveedor`);
          resumenPorEmpresa[empresa_code] = {
            codigoProveedor: erp_proveedor_code,
            totalComplementos: 0,
            montoTotal: '0.00'
          };
          continue;
        }

        // Ahora buscar complementos relacionados con esas facturas
        // usando CFDI_ComplementopagoD.IdDocumento
        const complementosResult = await pool.request().query(`
          SELECT TOP ${limite}
            cp.ID,
            cp.UUID AS ComplementoUUID,
            cp.FechaPago,
            cp.FormaDePagoP AS FormaPago,
            cp.MonedaP AS Moneda,
            cp.Monto AS MontoTotal,
            cpd.IdDocumento AS FacturaUUID,
            cpd.Folio AS FacturaFolio,
            cpd.MonedaDR AS FacturaMoneda,
            cpd.MetodoDePagoDR AS MetodoPago,
            cpd.NumParcialidad AS Parcialidad,
            cpd.ImpSaldoAnt AS SaldoAnterior,
            cpd.ImpPagado AS MontoPagado,
            cpd.ImpSaldoInsoluto AS SaldoPendiente
          FROM CFDI_Complementopago cp
          INNER JOIN CFDI_ComplementopagoD cpd ON cp.UUID = cpd.UUID
          WHERE 1=1
            ${filtroFecha}
          ORDER BY cp.FechaPago DESC
        `);

        console.log(`✅ ${empresa_code}: ${complementosResult.recordset.length} complementos encontrados`);

        // Enriquecer datos con nombre de empresa
        const complementos = complementosResult.recordset.map(comp => ({
          ...comp,
          EmpresaCodigo: empresa_code,
          EmpresaNombre: getNombreEmpresa(empresa_code),
          CodigoProveedor: erp_proveedor_code
        }));

        todosLosComplementos.push(...complementos);

        // Calcular resumen por empresa
        const totalComplementos = complementos.length;
        const montoTotal = complementos.reduce((sum, c) => sum + (parseFloat(c.MontoPagado) || 0), 0);

        resumenPorEmpresa[empresa_code] = {
          codigoProveedor: erp_proveedor_code,
          totalComplementos,
          montoTotal: montoTotal.toFixed(2),
          montoMoneda: complementos[0]?.Moneda || 'MXN'
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

    // 6. Agrupar complementos por UUID (un complemento puede pagar múltiples facturas)
    const complementosAgrupados = todosLosComplementos.reduce((acc, comp) => {
      const uuid = comp.ComplementoUUID;

      if (!acc[uuid]) {
        acc[uuid] = {
          ID: comp.ID,
          ComplementoUUID: uuid,
          FechaPago: comp.FechaPago,
          FormaPago: comp.FormaPago,
          Moneda: comp.Moneda,
          MontoTotal: comp.MontoTotal,
          EmpresaCodigo: comp.EmpresaCodigo,
          EmpresaNombre: comp.EmpresaNombre,
          CodigoProveedor: comp.CodigoProveedor,
          facturasRelacionadas: []
        };
      }

      acc[uuid].facturasRelacionadas.push({
        FacturaUUID: comp.FacturaUUID,
        FacturaFolio: comp.FacturaFolio,
        FacturaMoneda: comp.FacturaMoneda,
        MetodoPago: comp.MetodoPago,
        Parcialidad: comp.Parcialidad,
        SaldoAnterior: comp.SaldoAnterior,
        MontoPagado: comp.MontoPagado,
        SaldoPendiente: comp.SaldoPendiente
      });

      return acc;
    }, {} as any);

    const complementosFinales = Object.values(complementosAgrupados);

    // 7. Retornar respuesta consolidada
    return NextResponse.json({
      success: true,
      userId,
      totalComplementos: complementosFinales.length,
      totalDocumentosPagados: todosLosComplementos.length,
      totalEmpresas: Object.keys(resumenPorEmpresa).length,
      filtros: {
        empresa: empresaFiltro,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        limite
      },
      resumenPorEmpresa,
      complementos: complementosFinales
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/complementos] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener complementos de pago',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
