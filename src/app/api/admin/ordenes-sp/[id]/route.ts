/**
 * API Route: Detalle de Orden de Compra usando Stored Procedures
 *
 * GET /api/admin/ordenes-sp/[id]
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { storedProcedures } from '@/lib/database/stored-procedures';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ordenId = parseInt(id);

    if (isNaN(ordenId)) {
      return NextResponse.json(
        { success: false, error: 'ID de orden inválido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || '01';

    // Llamar al Stored Procedure
    const result = await storedProcedures.getOrdenCompraConDetalle(ordenId, empresa);

    if (!result.encabezado) {
      return NextResponse.json(
        { success: false, error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orden: result.encabezado,
        partidas: result.partidas
      }
    });

  } catch (error) {
    console.error('Error en /api/admin/ordenes-sp/[id]:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener orden de compra',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
