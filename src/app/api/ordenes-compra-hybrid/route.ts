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
      options.fechaDesde = new Date(fechaDesdeStr);
    }

    if (fechaHastaStr) {
      options.fechaHasta = new Date(fechaHastaStr);
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
  { params }: { params: { id: string } }
) {
  return withTenantContext(async (req, { tenant, user }) => {
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
  { params }: { params: { id: string } }
) {
  return withTenantContext(async (req, { tenant, user }) => {
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
