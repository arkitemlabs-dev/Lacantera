/**
 * API Route: Órdenes de Compra usando Stored Procedures
 *
 * GET /api/admin/ordenes-sp
 *
 * El SP solo retorna órdenes PENDIENTES (ya no recibe parámetro de estatus)
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.)
 * - proveedor: código del proveedor (para filtro del dropdown)
 * - rfc: RFC del proveedor
 * - movId: búsqueda por ID de orden (MovID)
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
      movId: searchParams.get('movId') || null,
      fechaDesde: searchParams.get('fecha_desde') || null,
      fechaHasta: searchParams.get('fecha_hasta') || null,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    console.log('[ordenes-sp] Parámetros recibidos:', {
      empresa: params.empresa,
      proveedor: params.proveedor,
      movId: params.movId,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      page: params.page,
      limit: params.limit
    });

    // Si hay filtros de búsqueda (movId o proveedor), necesitamos obtener TODOS los registros
    // para poder filtrarlos correctamente y luego paginar
    const hayFiltrosBusqueda = params.movId || params.proveedor;

    // Obtener datos del SP
    const result = await storedProcedures.getOrdenesCompra({
      empresa: params.empresa,
      rfc: params.rfc,
      fechaDesde: params.fechaDesde,
      fechaHasta: params.fechaHasta,
      // Si hay filtros de búsqueda, traer todos los registros para filtrar en el servidor
      page: hayFiltrosBusqueda ? 1 : params.page,
      limit: hayFiltrosBusqueda ? 10000 : params.limit,
    });

    let ordenesFiltradas = result.ordenes;

    // Filtrar por MovID si se especificó
    if (params.movId) {
      const movIdLower = params.movId.toLowerCase();
      ordenesFiltradas = ordenesFiltradas.filter((o: any) =>
        o.MovID?.toLowerCase().includes(movIdLower) ||
        o.ID?.toString().includes(params.movId!)
      );
    }

    // Filtrar por proveedor si se especificó
    if (params.proveedor) {
      ordenesFiltradas = ordenesFiltradas.filter((o: any) =>
        o.Proveedor === params.proveedor
      );
    }

    // Total después de filtrar
    const totalFiltrado = ordenesFiltradas.length;

    // Aplicar paginación manual si hubo filtros de búsqueda
    let ordenesPaginadas = ordenesFiltradas;
    if (hayFiltrosBusqueda) {
      const startIndex = (params.page - 1) * params.limit;
      const endIndex = startIndex + params.limit;
      ordenesPaginadas = ordenesFiltradas.slice(startIndex, endIndex);
    }

    console.log('[ordenes-sp] Resultado:', {
      totalOrdenes: ordenesPaginadas.length,
      totalFiltrado,
      primeraOrden: ordenesPaginadas[0] ? {
        ID: ordenesPaginadas[0].ID,
        Estatus: ordenesPaginadas[0].Estatus,
        FechaEmision: ordenesPaginadas[0].FechaEmision
      } : null
    });

    return NextResponse.json({
      success: true,
      data: ordenesPaginadas,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: hayFiltrosBusqueda ? totalFiltrado : result.total,
        totalPages: Math.ceil((hayFiltrosBusqueda ? totalFiltrado : result.total) / params.limit)
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
