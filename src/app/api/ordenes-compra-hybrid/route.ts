// src/app/api/ordenes-compra-hybrid/route.ts
// Ejemplo de API route híbrida: consulta ERP + Portal

import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import {
  getOrdenesCompraHybrid,
  getOrdenCompraDetalle,
  updateOrdenStatus,
} from '@/lib/database/hybrid-queries';

/**
 * Convierte fecha del formato DD-MM-YY a YYYY-MM-DD
 */
function convertirFecha(fechaStr: string): string {
  // Si ya está en formato ISO (YYYY-MM-DD), devolverla tal como está
  if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaStr;
  }

  // Si está en formato DD-MM-YY o DD-MM-YYYY
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    let [dia, mes, año] = partes;

    // Si el año es de 2 dígitos, convertir a 4 dígitos
    if (año.length === 2) {
      const añoNum = parseInt(año);
      // Asumir que años 00-30 son 2000-2030, y 31-99 son 1931-1999
      año = añoNum <= 30 ? `20${año}` : `19${año}`;
    }

    return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Si no se puede convertir, devolver tal como está
  return fechaStr;
}

/**
 * GET /api/ordenes-compra-hybrid
 * Obtiene órdenes de compra del ERP con estados del Portal
 *
 * Query params:
 * - limit: número de registros (default: 50)
 * - offset: offset para paginación (default: 0)
 * - fechaDesde: fecha desde (ISO string)
 * - fechaHasta: fecha hasta (ISO string)
 */
export const GET = withTenantContext(async (request, { tenant, user }) => {
  try {
    // Validar que sea proveedor
    if (user.role !== 'proveedor') {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo proveedores pueden consultar órdenes',
        },
        { status: 403 }
      );
    }

    // Validar que tenga código de proveedor
    if (!tenant.proveedorCodigo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no está mapeado a un proveedor del ERP',
        },
        { status: 400 }
      );
    }

    // Extraer query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const fechaDesdeStr = searchParams.get('fechaDesde');
    const fechaHastaStr = searchParams.get('fechaHasta');

    const options: any = { limit, offset };

    if (fechaDesdeStr) {
      // Convertir fecha DD-MM-YY a YYYY-MM-DD
      const fechaDesde = convertirFecha(fechaDesdeStr);
      console.log('🔍 DEBUG - Fecha desde original:', fechaDesdeStr);
      console.log('🔍 DEBUG - Fecha desde convertida:', fechaDesde);
      options.fechaDesde = new Date(fechaDesde);
      console.log('🔍 DEBUG - Objeto Date desde:', options.fechaDesde);
    }

    if (fechaHastaStr) {
      // Convertir fecha DD-MM-YY a YYYY-MM-DD
      const fechaHasta = convertirFecha(fechaHastaStr);
      console.log('🔍 DEBUG - Fecha hasta original:', fechaHastaStr);
      console.log('🔍 DEBUG - Fecha hasta convertida:', fechaHasta);
      options.fechaHasta = new Date(fechaHasta);
      console.log('🔍 DEBUG - Objeto Date hasta:', options.fechaHasta);
    }

    // Consulta híbrida
    const ordenes = await getOrdenesCompraHybrid(
      tenant.tenantId,
      tenant.proveedorCodigo,
      options
    );

    return NextResponse.json({
      success: true,
      data: {
        ordenes,
        total: ordenes.length,
        tenant: {
          id: tenant.tenantId,
          nombre: tenant.tenantName,
          empresa: tenant.empresaCodigo,
        },
        pagination: {
          limit,
          offset,
          hasMore: ordenes.length === limit,
        },
      },
      metadata: {
        source: 'hybrid_erp_portal',
        erpDatabase: tenant.erpDatabase,
        portalDatabase: 'PP',
        note: 'Datos combinados de ERP Intelisis (órdenes) y Portal (estados)',
      },
    });
  } catch (error: any) {
    console.error('[API] Error obteniendo órdenes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes de compra',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/ordenes-compra-hybrid/[id]
 * Obtiene detalle de una orden específica
 */
export async function GET_BY_ID(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return withTenantContext(async (req, { tenant, user }, _) => {
    try {
      const ordenId = parseInt(params.id);
      //... same logic

      if (isNaN(ordenId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID de orden inválido',
          },
          { status: 400 }
        );
      }

      const detalle = await getOrdenCompraDetalle(tenant.tenantId, ordenId);

      if (!detalle) {
        return NextResponse.json(
          {
            success: false,
            error: 'Orden no encontrada',
          },
          { status: 404 }
        );
      }

      // Validar que el proveedor tenga acceso a esta orden
      if (
        user.role === 'proveedor' &&
        detalle.encabezado.Proveedor !== tenant.proveedorCodigo
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'No tiene permisos para ver esta orden',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: detalle,
      });
    } catch (error: any) {
      console.error('[API] Error obteniendo detalle de orden:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al obtener detalle de la orden',
        },
        { status: 500 }
      );
    }
  })(request, { params });
}

/**
 * POST /api/ordenes-compra-hybrid/[id]/respond
 * Responde a una orden (solo actualiza Portal, NO ERP)
 *
 * Body:
 * {
 *   status_portal: "aceptada" | "rechazada",
 *   observaciones_proveedor?: string
 * }
 */
export async function POST_RESPOND(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return withTenantContext(async (req, { tenant, user }, _) => {
    try {
      const ordenId = parseInt(params.id);

      if (isNaN(ordenId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID de orden inválido',
          },
          { status: 400 }
        );
      }

      // Validar que sea proveedor
      if (user.role !== 'proveedor') {
        return NextResponse.json(
          {
            success: false,
            error: 'Solo proveedores pueden responder órdenes',
          },
          { status: 403 }
        );
      }

      // Leer body
      const body = await request.json();
      const { status_portal, observaciones_proveedor } = body;

      // Validar status
      const validStatuses = ['aceptada', 'rechazada', 'en_proceso'];
      if (!validStatuses.includes(status_portal)) {
        return NextResponse.json(
          {
            success: false,
            error: `Status inválido. Debe ser uno de: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Obtener la orden primero para validar
      const detalle = await getOrdenCompraDetalle(tenant.tenantId, ordenId);

      if (!detalle) {
        return NextResponse.json(
          {
            success: false,
            error: 'Orden no encontrada',
          },
          { status: 404 }
        );
      }

      // Validar que sea la orden del proveedor
      if (detalle.encabezado.Proveedor !== tenant.proveedorCodigo) {
        return NextResponse.json(
          {
            success: false,
            error: 'No tiene permisos para responder esta orden',
          },
          { status: 403 }
        );
      }

      // Actualizar en Portal (NO modifica ERP)
      await updateOrdenStatus(tenant.tenantId, ordenId, {
        status_portal,
        observaciones_proveedor,
        respondido_por: user.id,
      });

      return NextResponse.json({
        success: true,
        message: `Orden ${status_portal} exitosamente`,
        data: {
          ordenId,
          status_portal,
          nota: 'El estado fue guardado en el Portal. El ERP Intelisis no fue modificado.',
        },
      });
    } catch (error: any) {
      console.error('[API] Error respondiendo orden:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al responder la orden',
        },
        { status: 500 }
      );
    }
  })(request, { params });
}
