/**
 * API Route: Órdenes de Compra usando Stored Procedures
 *
 * GET /api/admin/ordenes-sp
 *
 * El SP solo retorna órdenes PENDIENTES (ya no recibe parámetro de estatus)
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.)
 * - proveedor: código del proveedor
 * - rfc: RFC del proveedor
 * - fecha_desde: fecha mínima (YYYY-MM-DD)
 * - fecha_hasta: fecha máxima (YYYY-MM-DD)
 * - page: número de página (default: 1)
 * - limit: registros por página (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { storedProcedures } from '@/lib/database/stored-procedures';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      empresa: searchParams.get('empresa') || '01',
      proveedor: searchParams.get('proveedor') || null,
      rfc: searchParams.get('rfc') || null,
      fechaDesde: searchParams.get('fecha_desde') || null,
      fechaHasta: searchParams.get('fecha_hasta') || null,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    console.log('[ordenes-sp] Parámetros recibidos:', {
      empresa: params.empresa,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      limit: params.limit
    });

    const result = await storedProcedures.getOrdenesCompra(params);

    console.log('[ordenes-sp] Resultado:', {
      totalOrdenes: result.ordenes.length,
      total: result.total,
      primeraOrden: result.ordenes[0] ? {
        ID: result.ordenes[0].ID,
        Estatus: result.ordenes[0].Estatus,
        FechaEmision: result.ordenes[0].FechaEmision
      } : null
    });

    return NextResponse.json({
      success: true,
      data: result.ordenes,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / params.limit)
      }
    });

  } catch (error) {
    console.error('Error en /api/admin/ordenes-sp:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes de compra',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
