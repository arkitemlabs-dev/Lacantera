// src/app/api/admin/ordenes/[id]/route.ts
// API para obtener detalles de una orden de compra específica

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getOrdenCompraPorID } from '@/lib/database/ordenes-compra-queries';

/**
 * GET /api/admin/ordenes/[id]
 * Obtiene los detalles de una orden de compra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea administrador
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'ID de orden inválido' },
        { status: 400 }
      );
    }

    console.log(`[API ORDEN DETALLE] Admin ${session.user.id} solicitando orden ${id}`);

    const orden = await getOrdenCompraPorID(Number(id));

    // Enriquecer orden con datos adicionales
    const ordenEnriquecida = {
      ...orden,
      nombreProveedor: orden.proveedor, // Por ahora usar el código como nombre
      total: (orden.importe || 0) + (orden.impuestos || 0),
    };

    return NextResponse.json({
      success: true,
      data: ordenEnriquecida,
    });

  } catch (error: any) {
    console.error('[API ORDEN DETALLE] Error:', error);
    
    if (error.message.includes('no encontrada')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de compra no encontrada',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener detalles de la orden',
        details: error.message,
      },
      { status: 500 }
    );
  }
}