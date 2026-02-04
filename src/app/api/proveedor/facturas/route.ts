// src/app/api/proveedor/facturas/route.ts
// Endpoint para obtener facturas del proveedor desde el ERP usando Stored Procedures

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import { storedProcedures } from '@/lib/database/stored-procedures';
import { getEmpresaERPFromTenant, getNombreEmpresa } from '@/lib/database/tenant-configs';
import sql from 'mssql';

// Mapeo de estatus del portal a estatus del SP
// El frontend usa: 'en-revision', 'aprobada', 'pagada', 'rechazada', 'todas'
// El SP espera: 'EN_REVISION', 'APROBADA', 'PAGADA', 'RECHAZADA', null (para todas)
const estatusMap: Record<string, string | null> = {
  'en-revision': 'EN_REVISION',
  'aprobada': 'APROBADA',
  'pagada': 'PAGADA',
  'rechazada': 'RECHAZADA',
  'todas': null
};

/**
 * GET /api/proveedor/facturas
 *
 * Obtiene las facturas del proveedor usando el SP sp_GetFacturasProveedor
 *
 * Query Parameters:
 * - empresa (opcional): Filtrar por empresa específica (código del portal)
 * - fecha_desde (opcional): YYYY-MM-DD
 * - fecha_hasta (opcional): YYYY-MM-DD
 * - estatus (opcional): en-revision, aprobada, pagada, rechazada, todas
 * - busqueda (opcional): Búsqueda por folio o número de orden
 * - page (opcional, default: 1)
 * - limit (opcional, default: 50)
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
    const empresaActual = session.user.empresaActual;

    console.log(`📍 Usuario: ${userId}, Empresa actual: ${empresaActual}`);

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada'
      }, { status: 400 });
    }

    // 2. Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const empresaFiltro = searchParams.get('empresa') || empresaActual;
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const estatusFiltro = searchParams.get('estatus') || 'todas';
    const busqueda = searchParams.get('busqueda');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('📍 Parámetros:', { empresaFiltro, fechaDesde, fechaHasta, estatusFiltro, busqueda, page, limit });

    // 3. Obtener código del proveedor desde el mapping del portal
    const portalPool = await getPortalConnection();
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaFiltro)
      .query(`
        SELECT
          erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresaCode
          AND activo = 1
      `);

    if (!mappingResult.recordset || mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontró mapeo de proveedor para esta empresa'
      }, { status: 404 });
    }

    const { erp_proveedor_code } = mappingResult.recordset[0];

    // 3b. Obtener RFC directamente del ERP (Fuente de Verdad)
    let rfcProveedor = null;
    if (erp_proveedor_code) {
      try {
        console.log(`📍 Buscando RFC en ERP para proveedor: ${erp_proveedor_code} en empresa: ${empresaFiltro}`);
        const erpPool = await getERPConnection(empresaFiltro);

        const rfcResult = await erpPool.request()
          .input('Codigo', sql.VarChar(20), erp_proveedor_code)
          .query('SELECT TOP 1 RFC FROM Prov WHERE Proveedor = @Codigo');

        if (rfcResult.recordset.length > 0) {
          rfcProveedor = rfcResult.recordset[0].RFC;
          console.log(`✅ RFC recuperado del ERP: ${rfcProveedor}`);
        } else {
          console.warn(`⚠️ Proveedor ${erp_proveedor_code} no encontrado en tabla Prov`);
          // Fallback: usar el código como RFC por si el SP lo soporta o es un error de datos
          rfcProveedor = erp_proveedor_code;
        }
      } catch (err) {
        console.error('❌ Error buscando RFC en ERP:', err);
        // Fallback en error
        rfcProveedor = erp_proveedor_code;
      }
    }

    console.log(`📍 Proveedor ERP: ${erp_proveedor_code}, RFC: ${rfcProveedor}`);

    // 4. Convertir código de empresa del portal al código del ERP
    const empresaCode = getEmpresaERPFromTenant(empresaFiltro);

    if (!empresaCode) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo determinar el código de empresa'
      }, { status: 400 });
    }

    // 5. Mapear estatus del frontend al formato del SP
    const estatusSP = estatusMap[estatusFiltro] || null;

    console.log(`📍 Llamando sp_GetFacturasProveedor - RFC: ${rfcProveedor}, Empresa: ${empresaCode}, Estatus: ${estatusSP}`);

    // 6. Llamar al SP para obtener facturas
    // Nota: Si el SP no está implementado aún, usar query directa como fallback
    let facturas: any[] = [];
    let total = 0;

    try {
      // Validar si tenemos un RFC válido para le SP (diferente al código)
      const isRfcValido = rfcProveedor && rfcProveedor !== erp_proveedor_code && rfcProveedor.length >= 10;

      if (!isRfcValido) {
        console.warn(`⚠️ RFC no válido o idéntico al código (${rfcProveedor}). Saltando SP y usando Query Directa por Código.`);
        throw new Error('RFC no disponible para SP');
      }

      const spResult = await storedProcedures.getFacturasProveedor(
        rfcProveedor || '', // TypeScript check
        empresaCode,
        {
          estatus: estatusSP || undefined,
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          busqueda: busqueda || undefined,
          page,
          limit
        }
      );

      facturas = spResult.facturas;
      total = spResult.total;
      console.log(`📦 Facturas obtenidas via SP: ${facturas.length} de ${total} total`);

    } catch (spError: any) {
      console.warn(`⚠️ SP no disponible, usando query directa:`, spError.message);

      // Fallback: usar query directa (código existente)
      const { getERPConnection } = await import('@/lib/database/multi-tenant-connection');
      const pool = await getERPConnection(empresaFiltro);

      // Construir filtros dinámicos (con parámetros para evitar SQL injection)
      let whereClause = `WHERE c.Cliente = @CodigoProveedor`;

      if (fechaDesde) {
        whereClause += ` AND c.FechaEmision >= @FechaDesde`;
      }
      if (fechaHasta) {
        whereClause += ` AND c.FechaEmision <= @FechaHasta`;
      }
      if (estatusSP) {
        // Mapeo inverso de estatus del portal al ERP
        if (estatusSP === 'EN_REVISION') {
          whereClause += ` AND c.Estatus = 'PENDIENTE'`;
        } else if (estatusSP === 'APROBADA') {
          whereClause += ` AND c.Estatus = 'CONCLUIDO' AND c.Saldo > 0`;
        } else if (estatusSP === 'PAGADA') {
          whereClause += ` AND c.Estatus = 'CONCLUIDO' AND c.Saldo = 0`;
        } else if (estatusSP === 'RECHAZADA') {
          whereClause += ` AND c.Estatus = 'CANCELADO'`;
        }
      }
      if (busqueda) {
        whereClause += ` AND (c.MovID LIKE @Busqueda OR c.Referencia LIKE @Busqueda)`;
      }

      const offset = (page - 1) * limit;

      const queryRequest = pool.request()
        .input('CodigoProveedor', sql.VarChar(20), erp_proveedor_code);

      if (fechaDesde) queryRequest.input('FechaDesde', sql.Date, new Date(fechaDesde));
      if (fechaHasta) queryRequest.input('FechaHasta', sql.Date, new Date(fechaHasta));
      if (busqueda) queryRequest.input('Busqueda', sql.VarChar(50), `%${busqueda}%`);

      const facturasResult = await queryRequest.query(`
        SELECT
          c.ID,
          c.Empresa,
          c.Mov AS Folio,
          c.MovID,
          c.FechaEmision,
          c.Moneda,
          c.TipoCambio,
          c.Importe AS Subtotal,
          c.Impuestos,
          (c.Importe + c.Impuestos) AS Total,
          c.Saldo,
          CASE
            WHEN c.Estatus = 'PENDIENTE' THEN 'EN_REVISION'
            WHEN c.Estatus = 'CONCLUIDO' AND c.Saldo > 0 THEN 'APROBADA'
            WHEN c.Estatus = 'CONCLUIDO' AND c.Saldo = 0 THEN 'PAGADA'
            WHEN c.Estatus = 'CANCELADO' THEN 'RECHAZADA'
            ELSE c.Estatus
          END AS Estatus,
          c.Referencia,
          c.Observaciones,
          c.Vencimiento,
          c.Usuario,
          c.FechaRegistro
        FROM Cxc c
        ${whereClause}
        ORDER BY c.FechaEmision DESC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `);

      facturas = facturasResult.recordset;

      // Obtener total
      const countResult = await pool.request()
        .input('CodigoProveedor', sql.VarChar(20), erp_proveedor_code)
        .query(`
          SELECT COUNT(*) AS Total
          FROM Cxc c
          ${whereClause.replace('@Busqueda', `'%${busqueda || ''}%'`).replace('@FechaDesde', `'${fechaDesde}'`).replace('@FechaHasta', `'${fechaHasta}'`)}
        `);

      total = countResult.recordset[0]?.Total || facturas.length;
    }

    // 7. Mapear facturas al formato del frontend
    const facturasFormateadas = facturas.map((factura: any) => ({
      id: factura.ID,
      folio: factura.Folio || factura.MovID,
      cfdi: factura.UUID || `CFDI-${factura.ID}`,
      serie: factura.Serie,
      empresa: factura.Empresa,
      empresaNombre: getNombreEmpresa(empresaFiltro),
      fechaEmision: factura.FechaEmision,
      moneda: factura.Moneda || 'MXN',
      tipoCambio: factura.TipoCambio || 1,
      subtotal: factura.Subtotal || 0,
      impuestos: factura.Impuestos || 0,
      total: factura.Total || 0,
      saldo: factura.Saldo || 0,
      // Mapear estatus del SP al formato del frontend
      estado: factura.Estatus === 'EN_REVISION' ? 'En revisión' :
        factura.Estatus === 'APROBADA' ? 'Aprobada' :
          factura.Estatus === 'PAGADA' ? 'Pagada' :
            factura.Estatus === 'RECHAZADA' ? 'Rechazada' : factura.Estatus,
      ordenAsociada: factura.OrdenCompraMovID || factura.Referencia || '-',
      ordenCompraID: factura.OrdenCompraID,
      referencia: factura.Referencia,
      observaciones: factura.Observaciones,
      motivoRechazo: factura.MotivoRechazo,
      urlPDF: factura.UrlPDF,
      urlXML: factura.UrlXML,
      fechaRegistro: factura.FechaRegistro,
      fechaRevision: factura.FechaRevision
    }));

    // 8. Calcular estadísticas
    const estadisticas = {
      totalFacturas: total,
      porEstatus: facturasFormateadas.reduce((acc: any, f: any) => {
        acc[f.estado] = (acc[f.estado] || 0) + 1;
        return acc;
      }, {}),
      montoTotal: facturasFormateadas.reduce((sum: number, f: any) => sum + (f.total || 0), 0),
      saldoTotal: facturasFormateadas.reduce((sum: number, f: any) => sum + (f.saldo || 0), 0)
    };

    console.log(`✅ Retornando ${facturasFormateadas.length} facturas`);

    // 9. Retornar respuesta
    return NextResponse.json({
      success: true,
      data: {
        empresaActual: empresaFiltro,
        codigoProveedorERP: erp_proveedor_code,
        rfcProveedor: rfcProveedor,
        facturas: facturasFormateadas,
        estadisticas,
        paginacion: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
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
