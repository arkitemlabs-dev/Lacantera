/**
 * API Route: Facturas usando Stored Procedures
 *
 * GET /api/admin/facturas
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.) - si no se especifica, usa la empresa de la sesión
 * - proveedor: código del proveedor
 * - rfc: RFC del proveedor
 * - estatus: estado de la factura (EN_REVISION, APROBADA, PAGADA, RECHAZADA)
 * - numeroFactura: búsqueda por número de factura
 * - fecha_desde: fecha mínima (YYYY-MM-DD)
 * - fecha_hasta: fecha máxima (YYYY-MM-DD)
 * - page: número de página (default: 1)
 * - limit: registros por página (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { storedProcedures } from '@/lib/database/stored-procedures';

// Mapeo de estatus del frontend al formato del SP
const estatusMap: Record<string, string | null> = {
  'en-revision': 'EN_REVISION',
  'pendiente-pago': 'PENDIENTE_PAGO',
  'aprobada': 'APROBADA',
  'pagada': 'PAGADA',
  'rechazada': 'RECHAZADA',
  'todas': null,
  '': null
};

export async function GET(request: NextRequest) {
  try {
    // Obtener la sesión del usuario para usar su empresa actual
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const empresaActual = session.user.empresaActual;
    console.log('[facturas-sp] Usuario:', session.user.id, 'Empresa actual:', empresaActual);

    const { searchParams } = new URL(request.url);

    // Usar la empresa de la sesión si no se especifica en los parámetros
    const params = {
      empresa: searchParams.get('empresa') || empresaActual || 'la-cantera-test',
      proveedor: searchParams.get('proveedor') || null,
      rfc: searchParams.get('rfc') || null,
      estatus: searchParams.get('estatus') || null,
      numeroFactura: searchParams.get('numeroFactura') || null,
      fechaDesde: searchParams.get('fecha_desde') || null,
      fechaHasta: searchParams.get('fecha_hasta') || null,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    // Mapear estatus del frontend al formato del SP
    const estatusSP = params.estatus ? (estatusMap[params.estatus] ?? params.estatus) : null;

    console.log('[facturas-sp] Parámetros recibidos:', {
      empresa: params.empresa,
      proveedor: params.proveedor,
      rfc: params.rfc,
      estatus: estatusSP,
      numeroFactura: params.numeroFactura,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      limit: params.limit
    });

    // Obtener datos del SP
    const result = await storedProcedures.getFacturas({
      empresa: params.empresa,
      proveedor: params.proveedor,
      rfc: params.rfc,
      estatus: estatusSP as any,
      numeroFactura: params.numeroFactura,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      limit: params.limit,
    });

    // Mapear las facturas al formato esperado por el frontend
    const facturasFormateadas = result.facturas.map((factura: any) => ({
      id: factura.ID,
      numeroFactura: factura.Folio || factura.NumeroFactura || `${factura.Serie || ''}-${factura.Folio || factura.ID}`,
      proveedor: factura.Proveedor,
      proveedorNombre: factura.ProveedorNombre || factura.Proveedor,
      proveedorRFC: factura.ProveedorRFC,
      ordenCompra: factura.OrdenCompraMovID || factura.OrdenCompra || '-',
      fechaEntrada: factura.FechaEntrada || factura.FechaEmision,
      fechaEmision: factura.FechaEmision,
      estado: mapEstadoToFrontend(factura.Estatus),
      monto: factura.Total || 0,
      saldo: factura.Saldo || 0,
      empresa: factura.Empresa,
      uuid: factura.UUID,
      serie: factura.Serie,
      urlPDF: factura.UrlPDF,
      urlXML: factura.UrlXML,
    }));

    console.log('[facturas-sp] Resultado:', {
      totalFacturas: facturasFormateadas.length,
      total: result.total,
      primeraFactura: facturasFormateadas[0] ? {
        id: facturasFormateadas[0].id,
        numeroFactura: facturasFormateadas[0].numeroFactura,
        estado: facturasFormateadas[0].estado
      } : null
    });

    return NextResponse.json({
      success: true,
      data: facturasFormateadas,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit)
      }
    });

  } catch (error) {
    console.error('Error en /api/admin/facturas:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener facturas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

/**
 * Mapea el estado del SP al formato del frontend
 */
function mapEstadoToFrontend(estatus: string | null | undefined): string {
  if (!estatus) return 'En Revisión';

  const estatusUpper = estatus.toUpperCase();

  switch (estatusUpper) {
    case 'EN_REVISION':
    case 'PENDIENTE':
      return 'En Revisión';
    case 'PENDIENTE_PAGO':
    case 'PENDIENTE PAGO':
      return 'Pendiente pago';
    case 'APROBADA':
    case 'CONCLUIDO':
      return 'Pendiente pago';
    case 'PAGADA':
      return 'Pagada';
    case 'RECHAZADA':
    case 'CANCELADO':
      return 'Rechazada';
    default:
      return estatus;
  }
}
