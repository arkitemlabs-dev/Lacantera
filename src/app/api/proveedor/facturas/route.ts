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
    console.log('🔍 [GET /api/proveedor/facturas] Iniciando refactorizado...');

    // 1. Autenticación y obtención de datos de sesión
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // @Empresa: Obligatorio de la sesión
    const empresaActual = session.user.empresaActual;

    // @Proveedor: Buscar la clave específica de esta empresa en el ERP
    // El session.user.proveedor puede ser un ID genérico del portal (ej. PROV003)
    // Debemos usar el mapeo específico para la empresa actual (ej. P00443)
    let proveedorERP = session.user.proveedor;

    if (session.user.empresasDisponibles && Array.isArray(session.user.empresasDisponibles)) {
      const mapping = session.user.empresasDisponibles.find(
        (e: any) => e.tenantId === empresaActual || e.empresaCodigo === empresaActual
      );
      if (mapping && mapping.proveedorCodigo) {
        proveedorERP = mapping.proveedorCodigo;
        console.log(`✅ Usando clave de proveedor ERP: ${proveedorERP} para empresa: ${empresaActual}`);
      }
    }

    if (!proveedorERP) {
      return NextResponse.json({
        success: false,
        error: 'El usuario logueado no tiene un código de proveedor asociado para esta empresa'
      }, { status: 403 });
    }

    if (!empresaActual) {
      return NextResponse.json({
        success: false,
        error: 'No hay empresa seleccionada en la sesión'
      }, { status: 400 });
    }

    // 2. Obtener filtros de la request
    const { searchParams } = new URL(request.url);
    const rfc = searchParams.get('rfc') || searchParams.get('Rfc');
    const estatusFiltro = searchParams.get('estatus') || 'todas';
    const fechaDesde = searchParams.get('fecha_desde') || searchParams.get('FechaDesde');
    const fechaHasta = searchParams.get('fecha_hasta') || searchParams.get('FechaHasta');
    const numeroFactura = searchParams.get('numero_factura') || searchParams.get('NumeroFactura') || searchParams.get('busqueda');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 3. Mapear estatus del frontend al formato del SP
    const estatusSP = estatusMap[estatusFiltro] || null;

    console.log(`📍 Llamando sp_GetFacturas - Proveedor: ${proveedorERP}, Empresa: ${empresaActual}, Estatus: ${estatusSP}`);

    // 4. Ejecutar Stored Procedure (SÓLO SP, sin queries directas)
    console.log(`\n[API EXEC] sp_GetFacturas:
      @Proveedor = '${proveedorERP}',
      @Empresa = '${empresaActual}',
      @Estatus = '${estatusSP}',
      @Page = ${page},
      @Limit = ${limit}
    `);

    const { facturas, total } = await storedProcedures.getFacturas({
      proveedor: proveedorERP,
      rfc: rfc,
      empresa: empresaActual,
      estatus: estatusSP as any,
      fechaDesde,
      fechaHasta,
      numeroFactura,
      page,
      limit
    });

    console.log(`[API RESULT] sp_GetFacturas éxito. Registros: ${facturas.length}, Total: ${total}\n`);

    // 5. Mapear al pattern de respuesta existente para compatibilidad con el frontend
    // NOTA: sp_GetFacturas devuelve: Factura, NombreProveedor, Compra, FechaEmision, Estado, Importe
    const facturasFormateadas = facturas.map((factura: any) => {
      const estadoRaw = factura.Estado || factura.Estatus || '';
      const estadoLegible =
        estadoRaw === 'EN_REVISION' ? 'En revisión' :
        estadoRaw === 'APROBADA' ? 'Aprobada' :
        estadoRaw === 'PAGADA' ? 'Pagada' :
        estadoRaw === 'RECHAZADA' ? 'Rechazada' :
        estadoRaw || 'En revisión';

      return {
        id: factura.ID || factura.Factura,
        folio: factura.Folio || factura.MovID || factura.Factura,
        cfdi: factura.UUID,
        serie: factura.Serie,
        empresa: factura.Empresa,
        empresaNombre: getNombreEmpresa(empresaActual),
        fechaEmision: factura.FechaEmision,
        total: factura.Total || factura.Importe || 0,
        saldo: factura.Saldo || 0,
        estado: estadoLegible,
        ordenAsociada: factura.OrdenCompraMovID || factura.Compra || '-',
        urlPDF: factura.UrlPDF,
        urlXML: factura.UrlXML
      };
    });

    // El SP puede no devolver segundo recordset con el total; usar facturas.length como fallback
    const totalEfectivo = total || facturasFormateadas.length;

    // Estadísticas básicas calculadas del resultado
    const estadisticas = {
      totalFacturas: totalEfectivo,
      montoTotal: facturasFormateadas.reduce((sum: number, f: any) => sum + (f.total || 0), 0),
      saldoTotal: facturasFormateadas.reduce((sum: number, f: any) => sum + (f.saldo || 0), 0),
      porEstatus: facturasFormateadas.reduce((acc: Record<string, number>, f: any) => {
        acc[f.estado] = (acc[f.estado] || 0) + 1;
        return acc;
      }, {})
    };

    // 6. Retornar respuesta con el formato del portal
    return NextResponse.json({
      success: true,
      data: {
        empresaActual,
        codigoProveedorERP: proveedorERP,
        facturas: facturasFormateadas,
        estadisticas,
        paginacion: {
          page,
          limit,
          total: totalEfectivo,
          totalPages: Math.ceil(totalEfectivo / limit) || 1
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [GET /api/proveedor/facturas] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener facturas desde el ERP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
