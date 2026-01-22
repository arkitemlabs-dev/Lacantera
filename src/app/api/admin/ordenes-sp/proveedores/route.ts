/**
 * API Route: Lista de proveedores con órdenes de compra pendientes
 *
 * GET /api/admin/ordenes-sp/proveedores
 *
 * Retorna la lista única de proveedores que tienen órdenes pendientes
 * para usar en el filtro de autocompletado
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.)
 * - busqueda: texto para filtrar proveedores (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { storedProcedures } from '@/lib/database/stored-procedures';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || '01';
    const busqueda = searchParams.get('busqueda')?.toLowerCase() || '';

    // Obtener todas las órdenes pendientes sin paginación para extraer proveedores únicos
    // Usamos un límite alto para obtener todos los proveedores
    const result = await storedProcedures.getOrdenesCompra({
      empresa,
      page: 1,
      limit: 10000, // Límite alto para obtener todos
    });

    // Extraer proveedores únicos
    const proveedoresMap = new Map<string, { codigo: string; nombre: string; rfc: string }>();

    result.ordenes.forEach((orden: any) => {
      if (orden.Proveedor && !proveedoresMap.has(orden.Proveedor)) {
        proveedoresMap.set(orden.Proveedor, {
          codigo: orden.Proveedor,
          nombre: orden.ProveedorNombre || orden.Proveedor,
          rfc: orden.ProveedorRFC || '',
        });
      }
    });

    // Convertir a array y ordenar
    let proveedores = Array.from(proveedoresMap.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Filtrar si hay búsqueda
    if (busqueda) {
      proveedores = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) ||
        p.codigo.toLowerCase().includes(busqueda) ||
        p.rfc.toLowerCase().includes(busqueda)
      );
    }

    return NextResponse.json({
      success: true,
      data: proveedores,
      total: proveedores.length
    });

  } catch (error) {
    console.error('Error en /api/admin/ordenes-sp/proveedores:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener lista de proveedores',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
