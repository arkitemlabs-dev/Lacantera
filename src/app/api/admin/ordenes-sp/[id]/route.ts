/**
 * API Route: Detalle de Orden de Compra usando Stored Procedures
 *
 * GET /api/admin/ordenes-sp/[id]
 * 
 * Solo obtiene las partidas adicionales, ya que los datos principales
 * vienen de la lista principal de órdenes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { storedProcedures } from '@/lib/database/stored-procedures';

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

    const ordenId = parseInt(params.id);
    if (isNaN(ordenId)) {
      return NextResponse.json(
        { error: 'ID de orden inválido' },
        { status: 400 }
      );
    }

    // Obtener solo las partidas usando SP5 (sp_GetOrdenCompraConDetalle)
    const result = await storedProcedures.getOrdenCompraConDetalle(ordenId, '01');

    return NextResponse.json({
      success: true,
      data: {
        partidas: result.partidas || []
      }
    });

  } catch (error) {
    console.error('Error en /api/admin/ordenes-sp/[id]:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener detalle de la orden',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}