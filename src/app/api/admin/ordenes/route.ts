// src/app/api/admin/ordenes/route.ts
// API para obtener órdenes de compra pendientes

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getOrdenesCompraPendientes, getOrdenesCompraStats } from '@/lib/database/ordenes-compra-queries';

/**
 * GET /api/admin/ordenes
 * Obtiene órdenes de compra pendientes con estadísticas
 */
export async function GET(request: NextRequest) {
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

    console.log(`[API ORDENES] Admin ${session.user.id} solicitando órdenes de compra`);

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const proveedor = searchParams.get('proveedor') || undefined;
    const fechaDesde = searchParams.get('fechaDesde') || undefined;
    const fechaHasta = searchParams.get('fechaHasta') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Obtener órdenes y estadísticas en paralelo
    const [ordenesResult, estadisticas] = await Promise.all([
      getOrdenesCompraPendientes({
        proveedor,
        fechaDesde,
        fechaHasta,
        page,
        limit,
      }),
      getOrdenesCompraStats(),
    ]);

    // Enriquecer órdenes con nombres de proveedores
    const ordenesEnriquecidas = ordenesResult.ordenes.map(orden => ({
      ...orden,
      nombreProveedor: orden.proveedor, // Por ahora usar el código como nombre
      total: (orden.importe || 0) + (orden.impuestos || 0),
    }));

    // Calcular estadísticas de las órdenes filtradas
    const totalOrdenes = ordenesEnriquecidas.length;
    const totalImporte = ordenesEnriquecidas.reduce((sum, orden) => sum + (orden.importe || 0), 0);
    const totalImpuestos = ordenesEnriquecidas.reduce((sum, orden) => sum + (orden.impuestos || 0), 0);
    const totalGeneral = totalImporte + totalImpuestos;

    const estadisticasFiltradas = {
      totalOrdenes,
      totalImporte,
      totalImpuestos,
      totalGeneral,
      ...estadisticas,
    };

    return NextResponse.json({
      success: true,
      data: {
        ordenes: ordenesEnriquecidas,
        estadisticas: estadisticasFiltradas,
        pagination: {
          page: ordenesResult.page,
          limit: ordenesResult.limit,
          total: ordenesResult.total,
          totalPages: ordenesResult.totalPages,
        },
      },
    });

  } catch (error: any) {
    console.error('[API ORDENES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener órdenes de compra',
        details: error.message,
      },
      { status: 500 }
    );
  }
}