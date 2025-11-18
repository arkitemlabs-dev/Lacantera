'use server';
// src/app/actions/ordenes-compra.ts

import { database } from '@/lib/database';
import type { OrdenCompra, StatusOrdenCompra } from '@/types/backend';
import type { OrdenCompraFilters } from '@/lib/database';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER ÓRDENES ====================

export async function getOrdenesCompraByProveedor(
  proveedorId: string,
  filters?: OrdenCompraFilters
) {
  try {
    const ordenes = await database.getOrdenesCompraByProveedor(proveedorId, filters);
    return { success: true, data: ordenes };
  } catch (error: any) {
    console.error('Error obteniendo órdenes de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function getOrdenesCompraByEmpresa(
  empresaId: string,
  filters?: OrdenCompraFilters
) {
  try {
    const ordenes = await database.getOrdenesCompraByEmpresa(empresaId, filters);
    return { success: true, data: ordenes };
  } catch (error: any) {
    console.error('Error obteniendo órdenes de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllOrdenesCompra(filters?: OrdenCompraFilters) {
  try {
    const ordenes = await database.getAllOrdenesCompra(filters);
    return { success: true, data: ordenes };
  } catch (error: any) {
    console.error('Error obteniendo órdenes de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function getOrdenCompra(id: string) {
  try {
    const orden = await database.getOrdenCompra(id);
    if (!orden) {
      return { success: false, error: 'Orden de compra no encontrada' };
    }
    return { success: true, data: orden };
  } catch (error: any) {
    console.error('Error obteniendo orden de compra:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CREAR ORDEN ====================

export async function createOrdenCompra(data: {
  ordenId: string;
  folio: string;
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  empresaId: string;
  empresaRazonSocial: string;
  fecha: Date;
  fechaEntrega: Date;
  montoTotal: number;
  moneda: 'MXN' | 'USD';
  conceptos: Array<{
    clave: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    importe: number;
  }>;
  observaciones?: string;
  intelisisId: string;
  createdBy: string;
}) {
  try {
    const ordenData: Omit<OrdenCompra, 'id'> = {
      ...data,
      status: 'pendiente_aceptacion',
      facturada: false,
      ultimaSincronizacion: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await database.createOrdenCompra(ordenData);

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { id, message: 'Orden de compra creada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error creando orden de compra:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ACTUALIZAR ORDEN ====================

export async function updateOrdenCompraStatus(id: string, status: StatusOrdenCompra) {
  try {
    await database.updateOrdenCompra(id, {
      status,
      updatedAt: new Date(),
    });

    // TODO: Crear notificación

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Orden de compra actualizada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando orden de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function aceptarOrdenCompra(id: string, proveedorId: string) {
  try {
    const orden = await database.getOrdenCompra(id);
    if (!orden) {
      return { success: false, error: 'Orden de compra no encontrada' };
    }

    if (orden.proveedorId !== proveedorId) {
      return { success: false, error: 'No tienes permiso para aceptar esta orden' };
    }

    await database.updateOrdenCompra(id, {
      status: 'aceptada',
      updatedAt: new Date(),
    });

    // TODO: Crear notificación para admin

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Orden de compra aceptada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error aceptando orden de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function rechazarOrdenCompra(
  id: string,
  proveedorId: string,
  observaciones?: string
) {
  try {
    const orden = await database.getOrdenCompra(id);
    if (!orden) {
      return { success: false, error: 'Orden de compra no encontrada' };
    }

    if (orden.proveedorId !== proveedorId) {
      return { success: false, error: 'No tienes permiso para rechazar esta orden' };
    }

    await database.updateOrdenCompra(id, {
      status: 'rechazada',
      observaciones,
      updatedAt: new Date(),
    });

    // TODO: Crear notificación para admin

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Orden de compra rechazada' },
    };
  } catch (error: any) {
    console.error('Error rechazando orden de compra:', error);
    return { success: false, error: error.message };
  }
}

export async function marcarOrdenComoCompletada(id: string) {
  try {
    await database.updateOrdenCompra(id, {
      status: 'completada',
      updatedAt: new Date(),
    });

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Orden de compra marcada como completada' },
    };
  } catch (error: any) {
    console.error('Error marcando orden como completada:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ASOCIAR FACTURA ====================

export async function asociarFacturaAOrden(ordenId: string, facturaId: string) {
  try {
    await database.updateOrdenCompra(ordenId, {
      facturada: true,
      facturaId,
      updatedAt: new Date(),
    });

    revalidatePath('/proveedores/ordenes-de-compra');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Factura asociada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error asociando factura a orden:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS ====================

export async function getEstadisticasOrdenesCompra(
  proveedorId?: string,
  empresaId?: string
) {
  try {
    let ordenes: OrdenCompra[];

    if (proveedorId) {
      ordenes = await database.getOrdenesCompraByProveedor(proveedorId);
    } else if (empresaId) {
      ordenes = await database.getOrdenesCompraByEmpresa(empresaId);
    } else {
      ordenes = await database.getAllOrdenesCompra();
    }

    const total = ordenes.length;
    const pendientes = ordenes.filter((o) => o.status === 'pendiente_aceptacion').length;
    const aceptadas = ordenes.filter((o) => o.status === 'aceptada').length;
    const completadas = ordenes.filter((o) => o.status === 'completada').length;
    const canceladas = ordenes.filter((o) => o.status === 'cancelada').length;
    const facturadas = ordenes.filter((o) => o.facturada).length;

    const montoTotal = ordenes.reduce((sum, o) => sum + o.montoTotal, 0);
    const montoFacturado = ordenes
      .filter((o) => o.facturada)
      .reduce((sum, o) => sum + o.montoTotal, 0);

    return {
      success: true,
      data: {
        total,
        pendientes,
        aceptadas,
        completadas,
        canceladas,
        facturadas,
        montoTotal,
        montoFacturado,
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
}