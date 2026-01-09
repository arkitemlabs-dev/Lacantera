/**
 * API Route: Órdenes de Compra del Proveedor usando Stored Procedures
 *
 * GET /api/proveedor/ordenes-sp
 *
 * Query params:
 * - empresa: código de empresa (OBLIGATORIO)
 * - estatus: PENDIENTE, CONCLUIDO, CANCELADO, todas
 * - fecha_desde: fecha mínima (YYYY-MM-DD)
 * - fecha_hasta: fecha máxima (YYYY-MM-DD)
 * - page: número de página (default: 1)
 * - limit: registros por página (default: 50)
 *
 * NOTA: El RFC se obtiene de la sesión del usuario autenticado
 */

import { NextRequest, NextResponse } from 'next/server';
import { storedProcedures } from '@/lib/database/stored-procedures';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    // Obtener sesión del usuario
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // El RFC viene del usuario autenticado
    const rfc = (session.user as any).rfc;

    if (!rfc) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin RFC asignado' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const empresa = searchParams.get('empresa');
    if (!empresa) {
      return NextResponse.json(
        { success: false, error: 'Parámetro empresa es obligatorio' },
        { status: 400 }
      );
    }

    // Extraer parámetros
    const params = {
      estatus: searchParams.get('estatus') as any || null,
      fechaDesde: searchParams.get('fecha_desde') || null,
      fechaHasta: searchParams.get('fecha_hasta') || null,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Llamar al Stored Procedure
    const result = await storedProcedures.getOrdenesCompraProveedor(rfc, empresa, params);

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
    console.error('Error en /api/proveedor/ordenes-sp:', error);

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
