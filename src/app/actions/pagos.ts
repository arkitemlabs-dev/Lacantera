'use server';
// src/app/actions/pagos.ts

import { database } from '@/lib/database';
import type { 
  ComprobantePago, 
  ComplementoPago, 
  StatusPago,
  MetodoPago 
} from '@/types/backend';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER PAGOS ====================

export async function getPagosByProveedor(proveedorId: string) {
  try {
    const pagos = await database.getPagosByProveedor(proveedorId);
    return { success: true, data: pagos };
  } catch (error: any) {
    console.error('Error obteniendo pagos:', error);
    return { success: false, error: error.message };
  }
}

export async function getPagosByEmpresa(empresaId: string) {
  try {
    const pagos = await database.getPagosByEmpresa(empresaId);
    return { success: true, data: pagos };
  } catch (error: any) {
    console.error('Error obteniendo pagos de empresa:', error);
    return { success: false, error: error.message };
  }
}

export async function getPago(id: string) {
  try {
    const pago = await database.getPago(id);
    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }
    return { success: true, data: pago };
  } catch (error: any) {
    console.error('Error obteniendo pago:', error);
    return { success: false, error: error.message };
  }
}

export async function getPagosPendientesComplemento(empresaId?: string) {
  try {
    const pagos = await database.getPagosByStatus('pagado_pendiente_complemento', empresaId);
    return { success: true, data: pagos };
  } catch (error: any) {
    console.error('Error obteniendo pagos pendientes de complemento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CREAR PAGO ====================

export async function crearPago(pagoData: {
  facturaIds: string[];
  proveedorId: string;
  empresaId: string;
  monto: number;
  metodoPago: MetodoPago;
  fechaEjecucion: Date;
  creadoPor: string;
  notas?: string;
}) {
  try {
    // Verificar que las facturas existen y están aprobadas
    const facturas = await Promise.all(
      pagoData.facturaIds.map(id => database.getFactura(id))
    );
    
    const facturasInvalidas = facturas.filter(f => !f || f.status !== 'aprobada');
    if (facturasInvalidas.length > 0) {
      return { success: false, error: 'Algunas facturas no están aprobadas o no existen' };
    }
    
    // Verificar que el proveedor no tenga complementos pendientes
    const complementosPendientes = await database.getComplementosPendientesByProveedor(pagoData.proveedorId);
    if (complementosPendientes.length > 0) {
      return { 
        success: false, 
        error: 'El proveedor tiene complementos de pago pendientes. Complete los complementos antes de crear nuevos pagos.' 
      };
    }

    // Calcular monto total de las facturas
    const montoTotal = facturas.reduce((total, factura) => total + (factura?.montoTotal || 0), 0);
    
    if (Math.abs(montoTotal - pagoData.monto) > 0.01) {
      return { 
        success: false, 
        error: `El monto del pago ($${pagoData.monto}) no coincide con el total de las facturas ($${montoTotal})` 
      };
    }

    const pago = await database.createPago({
      ...pagoData,
      status: 'programado',
      requiereComplemento: true, // Por defecto siempre requiere complemento en México
      createdAt: new Date()
    });

    // Actualizar estado de las facturas a "pagada"
    await Promise.all(
      pagoData.facturaIds.map(id => 
        database.updateFactura(id, { 
          status: 'pagada', 
          pagoId: pago.id,
          updatedAt: new Date()
        })
      )
    );

    // Crear notificación para el proveedor
    await database.createNotificacion({
      usuarioId: pagoData.proveedorId,
      tipo: 'pago_realizado',
      titulo: 'Pago realizado',
      mensaje: `Se ha realizado un pago de $${pagoData.monto}. Deberá subir el complemento de pago correspondiente.`,
      leida: false,
      empresaId: pagoData.empresaId
    });

    revalidatePath('/pagos');
    revalidatePath('/facturas');
    
    return { success: true, data: pago };
  } catch (error: any) {
    console.error('Error creando pago:', error);
    return { success: false, error: error.message };
  }
}

// ==================== COMPROBANTES DE PAGO ====================

export async function uploadComprobantePago(formData: FormData) {
  try {
    const pagoId = formData.get('pagoId') as string;
    const archivo = formData.get('archivo') as File;
    const tipo = formData.get('tipo') as 'comprobante_transferencia' | 'estado_cuenta' | 'otro';

    if (!pagoId || !archivo) {
      return { success: false, error: 'Datos incompletos' };
    }

    // Validar archivo
    if (!archivo.type.includes('pdf') && !archivo.type.includes('image')) {
      return { success: false, error: 'Solo se permiten archivos PDF o imágenes' };
    }

    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Archivo muy grande. Máximo 10MB' };
    }

    const pago = await database.getPago(pagoId);
    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    const comprobante = await database.uploadComprobantePago({
      pagoId,
      archivo,
      tipo,
      empresaId: pago.empresaId
    });

    // Actualizar status del pago
    await database.updatePago(pagoId, {
      status: 'pagado_pendiente_complemento',
      comprobanteIds: [...(pago.comprobanteIds || []), comprobante.id],
      updatedAt: new Date()
    });

    revalidatePath('/pagos');
    
    return { success: true, data: comprobante };
  } catch (error: any) {
    console.error('Error subiendo comprobante:', error);
    return { success: false, error: error.message };
  }
}

// ==================== COMPLEMENTOS DE PAGO ====================

export async function uploadComplementoPago(formData: FormData) {
  try {
    const pagoId = formData.get('pagoId') as string;
    const archivo = formData.get('archivo') as File;
    const folioFiscal = formData.get('folioFiscal') as string;
    const usuarioId = formData.get('usuarioId') as string; // ID del proveedor

    if (!pagoId || !archivo || !folioFiscal) {
      return { success: false, error: 'Datos incompletos' };
    }

    // Validar que sea un XML
    if (archivo.type !== 'text/xml' && !archivo.name.endsWith('.xml')) {
      return { success: false, error: 'El complemento de pago debe ser un archivo XML' };
    }

    const pago = await database.getPago(pagoId);
    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    // Verificar que el usuario puede subir este complemento
    if (pago.proveedorId !== usuarioId) {
      return { success: false, error: 'No autorizado para subir este complemento' };
    }

    if (pago.status !== 'pagado_pendiente_complemento') {
      return { success: false, error: 'Este pago no requiere complemento o ya fue completado' };
    }

    const complemento = await database.uploadComplementoPago({
      pagoId,
      archivo,
      folioFiscal,
      proveedorId: usuarioId,
      empresaId: pago.empresaId
    });

    // Actualizar status del pago a completado
    await database.updatePago(pagoId, {
      status: 'completado',
      complementoId: complemento.id,
      completadoAt: new Date(),
      updatedAt: new Date()
    });

    // Crear notificación para admin
    await database.createNotificacion({
      usuarioId: 'admin', // Notificar a todos los admins
      tipo: 'complemento_subido',
      titulo: 'Complemento de pago recibido',
      mensaje: `El proveedor ha subido el complemento para el pago ${pagoId}`,
      leida: false,
      empresaId: pago.empresaId
    });

    revalidatePath('/pagos');
    revalidatePath('/proveedores/pagos');
    
    return { success: true, data: complemento };
  } catch (error: any) {
    console.error('Error subiendo complemento:', error);
    return { success: false, error: error.message };
  }
}

export async function getComplementosPendientes(proveedorId: string) {
  try {
    const complementos = await database.getComplementosPendientesByProveedor(proveedorId);
    return { success: true, data: complementos };
  } catch (error: any) {
    console.error('Error obteniendo complementos pendientes:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDACIÓN DE COMPLEMENTOS (ADMIN) ====================

export async function validarComplemento(
  complementoId: string, 
  aprobado: boolean, 
  comentarios?: string,
  validadoPor?: string
) {
  try {
    const complemento = await database.getComplementoPago(complementoId);
    if (!complemento) {
      return { success: false, error: 'Complemento no encontrado' };
    }

    await database.updateComplementoPago(complementoId, {
      validado: aprobado,
      comentarios,
      validadoPor,
      fechaValidacion: new Date(),
      updatedAt: new Date()
    });

    // Si es rechazado, revertir el estado del pago
    if (!aprobado) {
      await database.updatePago(complemento.pagoId, {
        status: 'pagado_pendiente_complemento',
        complementoId: undefined,
        completadoAt: undefined,
        updatedAt: new Date()
      });
    }

    // Notificar al proveedor
    const pago = await database.getPago(complemento.pagoId);
    await database.createNotificacion({
      usuarioId: pago?.proveedorId || '',
      tipo: 'complemento_validado',
      titulo: `Complemento ${aprobado ? 'aprobado' : 'rechazado'}`,
      mensaje: `Su complemento de pago ha sido ${aprobado ? 'aprobado' : 'rechazado'}${comentarios ? `: ${comentarios}` : ''}`,
      leida: false,
      empresaId: complemento.empresaId
    });

    revalidatePath('/pagos');
    
    return { success: true, message: 'Complemento validado correctamente' };
  } catch (error: any) {
    console.error('Error validando complemento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== REPORTES DE PAGOS ====================

export async function getResumenPagos(empresaId: string, fechaInicio?: Date, fechaFin?: Date) {
  try {
    const pagos = await database.getPagosByEmpresa(empresaId);
    
    // Filtrar por fechas si se proporcionan
    let pagosFiltrados = pagos;
    if (fechaInicio && fechaFin) {
      pagosFiltrados = pagos.filter(pago => {
        const fechaPago = new Date(pago.fechaEjecucion);
        return fechaPago >= fechaInicio && fechaPago <= fechaFin;
      });
    }

    const resumen = {
      totalPagado: pagosFiltrados
        .filter(p => p.status === 'completado')
        .reduce((total, pago) => total + pago.monto, 0),
      
      totalPendienteComplemento: pagosFiltrados
        .filter(p => p.status === 'pagado_pendiente_complemento')
        .reduce((total, pago) => total + pago.monto, 0),
      
      totalProgramado: pagosFiltrados
        .filter(p => p.status === 'programado')
        .reduce((total, pago) => total + pago.monto, 0),
      
      cantidadPagos: pagosFiltrados.length,
      cantidadProveedores: new Set(pagosFiltrados.map(p => p.proveedorId)).size,
      
      pagosPorEstatus: {
        completado: pagosFiltrados.filter(p => p.status === 'completado').length,
        pendienteComplemento: pagosFiltrados.filter(p => p.status === 'pagado_pendiente_complemento').length,
        programado: pagosFiltrados.filter(p => p.status === 'programado').length,
        cancelado: pagosFiltrados.filter(p => p.status === 'cancelado').length
      }
    };
    
    return { success: true, data: resumen };
  } catch (error: any) {
    console.error('Error generando resumen de pagos:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CANCELAR PAGO ====================

export async function cancelarPago(pagoId: string, motivo: string, canceladoPor: string) {
  try {
    const pago = await database.getPago(pagoId);
    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    if (pago.status === 'completado') {
      return { success: false, error: 'No se puede cancelar un pago completado' };
    }

    await database.updatePago(pagoId, {
      status: 'cancelado',
      motivoCancelacion: motivo,
      canceladoPor,
      canceladoAt: new Date(),
      updatedAt: new Date()
    });

    // Revertir estado de las facturas
    if (pago.facturaIds) {
      await Promise.all(
        pago.facturaIds.map(facturaId => 
          database.updateFactura(facturaId, { 
            status: 'aprobada',
            pagoId: undefined,
            updatedAt: new Date()
          })
        )
      );
    }

    // Notificar al proveedor
    await database.createNotificacion({
      usuarioId: pago.proveedorId,
      tipo: 'pago_cancelado',
      titulo: 'Pago cancelado',
      mensaje: `El pago por $${pago.monto} ha sido cancelado. Motivo: ${motivo}`,
      leida: false,
      empresaId: pago.empresaId
    });

    revalidatePath('/pagos');
    revalidatePath('/facturas');
    
    return { success: true, message: 'Pago cancelado correctamente' };
  } catch (error: any) {
    console.error('Error cancelando pago:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DESCARGAR DOCUMENTOS ====================

export async function getDownloadUrlPago(pagoId: string, tipo: 'comprobante' | 'complemento', documentoId?: string) {
  try {
    const pago = await database.getPago(pagoId);
    if (!pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    let documento;
    if (tipo === 'comprobante' && documentoId) {
      documento = await database.getComprobantePago(documentoId);
    } else if (tipo === 'complemento' && pago.complementoId) {
      documento = await database.getComplementoPago(pago.complementoId);
    }

    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }

    const downloadUrl = await database.getDownloadUrl(documento.archivoUrl);
    
    return { success: true, data: { url: downloadUrl, nombre: documento.archivoNombre } };
  } catch (error: any) {
    console.error('Error obteniendo URL de descarga:', error);
    return { success: false, error: error.message };
  }
}