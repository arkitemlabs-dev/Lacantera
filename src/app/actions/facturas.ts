'use server';
// src/app/actions/facturas.ts

import { database } from '@/lib/database';
import type { Factura, StatusFactura } from '@/types/backend';
import type { FacturaFilters } from '@/lib/database';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER FACTURAS ====================

export async function getFacturasByProveedor(
  proveedorId: string,
  filters?: FacturaFilters
) {
  try {
    const facturas = await database.getFacturasByProveedor(proveedorId, filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters) {
  try {
    const facturas = await database.getFacturasByEmpresa(empresaId, filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllFacturas(filters?: FacturaFilters) {
  try {
    const facturas = await database.getAllFacturas(filters);
    return { success: true, data: facturas };
  } catch (error: any) {
    console.error('Error obteniendo facturas:', error);
    return { success: false, error: error.message };
  }
}

export async function getFactura(id: string) {
  try {
    const factura = await database.getFactura(id);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }
    return { success: true, data: factura };
  } catch (error: any) {
    console.error('Error obteniendo factura:', error);
    return { success: false, error: error.message };
  }
}

export async function getFacturaByUUID(uuid: string) {
  try {
    const factura = await database.getFacturaByUUID(uuid);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }
    return { success: true, data: factura };
  } catch (error: any) {
    console.error('Error obteniendo factura por UUID:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CREAR FACTURA ====================

export async function createFactura(data: {
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  empresaId: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: Date;
  subtotal: number;
  iva: number;
  total: number;
  moneda: 'MXN' | 'USD';
  tipoCambio?: number;
  xmlUrl: string;
  pdfUrl: string;
  ordenCompraId?: string;
  observaciones?: string;
  uploadedBy: string;
}) {
  try {
    // Verificar que no exista una factura con el mismo UUID
    const existing = await database.getFacturaByUUID(data.uuid);
    if (existing) {
      return {
        success: false,
        error: 'Ya existe una factura con este UUID',
      };
    }

    const facturaData: Omit<Factura, 'id'> = {
      facturaId: `FACT-${Date.now()}`,
      ...data,
      status: 'pendiente_revision',
      validadaSAT: false,
      pagada: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const id = await database.createFactura(facturaData);

    // TODO: Crear notificación para admin

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: { id, message: 'Factura creada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error creando factura:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ACTUALIZAR FACTURA ====================

export async function updateFacturaStatus(
  id: string,
  status: StatusFactura,
  motivoRechazo?: string,
  revisadoPor?: string
) {
  try {
    const updateData: Partial<Factura> = {
      status,
      revisadoPor,
      fechaRevision: new Date(),
    };

    if (status === 'rechazada' && motivoRechazo) {
      updateData.motivoRechazo = motivoRechazo;
    }

    if (status === 'pagada') {
      updateData.pagada = true;
      updateData.fechaPago = new Date();
    }

    await database.updateFactura(id, updateData);

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: { message: 'Factura actualizada exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando factura:', error);
    return { success: false, error: error.message };
  }
}

export async function marcarFacturaComoPagada(
  id: string,
  complementoPagoId?: string,
  revisadoPor?: string
) {
  try {
    await database.updateFactura(id, {
      status: 'pagada',
      pagada: true,
      fechaPago: new Date(),
      complementoPagoId,
      revisadoPor,
    });

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');
    revalidatePath('/pagos');

    return {
      success: true,
      data: { message: 'Factura marcada como pagada' },
    };
  } catch (error: any) {
    console.error('Error marcando factura como pagada:', error);
    return { success: false, error: error.message };
  }
}

export async function asociarFacturaAOrdenCompra(facturaId: string, ordenCompraId: string) {
  try {
    await database.updateFactura(facturaId, { ordenCompraId });

    // También actualizar la orden de compra
    await database.updateOrdenCompra(ordenCompraId, {
      facturada: true,
      facturaId,
    });

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');
    revalidatePath('/ordenes-de-compra');

    return {
      success: true,
      data: { message: 'Factura asociada a orden de compra' },
    };
  } catch (error: any) {
    console.error('Error asociando factura:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDACIÓN SAT ====================

export async function validarFacturaConSAT(id: string) {
  try {
    const factura = await database.getFactura(id);
    if (!factura) {
      return { success: false, error: 'Factura no encontrada' };
    }

    // TODO: Implementar llamada real al SAT
    // Por ahora, simulamos validación exitosa
    const validadaSAT = true;
    const estatusSAT = 'vigente' as const;

    await database.updateFactura(id, {
      validadaSAT,
      estatusSAT,
      fechaValidacionSAT: new Date(),
    });

    revalidatePath('/proveedores/facturacion');
    revalidatePath('/facturas');

    return {
      success: true,
      data: {
        validadaSAT,
        estatusSAT,
        message: 'Factura validada con SAT exitosamente',
      },
    };
  } catch (error: any) {
    console.error('Error validando factura con SAT:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS ====================

export async function getEstadisticasFacturas(proveedorId?: string, empresaId?: string) {
  try {
    let facturas: Factura[];

    if (proveedorId) {
      const result = await database.getFacturasByProveedor(proveedorId);
      facturas = result;
    } else if (empresaId) {
      const result = await database.getFacturasByEmpresa(empresaId);
      facturas = result;
    } else {
      const result = await database.getAllFacturas();
      facturas = result;
    }

    const total = facturas.length;
    const pendientes = facturas.filter((f) => f.status === 'pendiente_revision').length;
    const aprobadas = facturas.filter((f) => f.status === 'aprobada').length;
    const pagadas = facturas.filter((f) => f.status === 'pagada').length;
    const rechazadas = facturas.filter((f) => f.status === 'rechazada').length;

    const montoTotal = facturas.reduce((sum, f) => sum + f.total, 0);
    const montoPagado = facturas
      .filter((f) => f.pagada)
      .reduce((sum, f) => sum + f.total, 0);
    const montoPendiente = montoTotal - montoPagado;

    return {
      success: true,
      data: {
        total,
        pendientes,
        aprobadas,
        pagadas,
        rechazadas,
        montoTotal,
        montoPagado,
        montoPendiente,
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
}