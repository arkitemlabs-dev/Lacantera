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

    // Validar que hay empresa en la sesión
    if (!empresaActual) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    // Usar la empresa de la sesión si no se especifica en los parámetros
    const params = {
      empresa: searchParams.get('empresa') || empresaActual,
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
    console.log('[facturas-sp] Llamando SP con empresa:', params.empresa);
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

    // Log para debug: ver estructura de datos del SP
    if (result.facturas.length > 0) {
      console.log('[facturas-sp] Campos disponibles en primera factura:', Object.keys(result.facturas[0]));
      console.log('[facturas-sp] Primera factura raw:', JSON.stringify(result.facturas[0], null, 2));
    }

    // Mapear las facturas al formato esperado por el frontend
    // El SP retorna: Factura, NombreProveedor, Compra, FechEstado, Estado, Importe
    const facturasFormateadas = result.facturas.map((factura: any) => ({
      id: factura.ID,
      // El SP retorna 'Factura' como número de factura
      numeroFactura: factura.Factura || factura.Folio || factura.NumeroFactura || `${factura.Serie || ''}-${factura.Folio || factura.ID}`,
      proveedor: factura.Proveedor,
      // El SP retorna 'NombreProveedor'
      proveedorNombre: factura.NombreProveedor || factura.ProveedorNombre || factura.Proveedor,
      proveedorRFC: factura.ProveedorRFC || factura.RFC,
      // El SP retorna 'Compra' como la orden de compra asociada
      ordenCompra: factura.Compra || factura.OrdenCompraMovID || factura.OrdenCompra || '-',
      // El SP retorna 'FechEstado' como fecha del estado
      fechaEntrada: factura.FechEstado || factura.FechaEntrada || factura.FechaEmision,
      fechaEmision: factura.FechaEmision || factura.FechEstado,
      // El SP retorna 'Estado' (no 'Estatus')
      estado: factura.Estado || mapEstadoToFrontend(factura.Estatus),
      // El SP retorna 'Importe' (no 'Total')
      monto: factura.Importe || factura.Total || 0,
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
