'use server';
// src/app/actions/documentos.ts

import { database } from '@/lib/database';
import type { DocumentoProveedor, StatusDocumento, TipoDocumentoProveedor } from '@/types/backend';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER DOCUMENTOS ====================

export async function getDocumentosByProveedor(proveedorId: string) {
  try {
    const documentos = await database.getDocumentosByProveedor(proveedorId);
    return { success: true, data: documentos };
  } catch (error: any) {
    console.error('Error obteniendo documentos:', error);
    return { success: false, error: error.message };
  }
}

export async function getDocumento(id: string) {
  try {
    const documento = await database.getDocumento(id);
    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }
    return { success: true, data: documento };
  } catch (error: any) {
    console.error('Error obteniendo documento:', error);
    return { success: false, error: error.message };
  }
}

export async function getDocumentosVencidos(empresaId?: string) {
  try {
    // Documentos que vencen en los próximos 30 días
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const documentos = await database.getDocumentosVenciendo(now, thirtyDaysFromNow, empresaId);
    return { success: true, data: documentos };
  } catch (error: any) {
    console.error('Error obteniendo documentos por vencer:', error);
    return { success: false, error: error.message };
  }
}

// ==================== SUBIR DOCUMENTOS ====================

export async function uploadDocumento(formData: FormData) {
  try {
    const proveedorId = formData.get('proveedorId') as string;
    const tipoDocumento = formData.get('tipoDocumento') as TipoDocumentoProveedor;
    const archivo = formData.get('archivo') as File;

    if (!proveedorId || !tipoDocumento || !archivo) {
      return { success: false, error: 'Datos incompletos' };
    }

    // Validar tipo de archivo
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(archivo.type)) {
      return { success: false, error: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG' };
    }

    // Validar tamaño (max 10MB)
    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Archivo muy grande. Máximo 10MB' };
    }

    // Verificar si el proveedor existe
    const proveedor = await database.getProveedor(proveedorId);
    if (!proveedor) {
      return { success: false, error: 'Proveedor no encontrado' };
    }

    const documento = await database.uploadDocumento({
      proveedorId,
      tipoDocumento,
      archivo,
      empresaId: proveedor.empresaId || ''
    });

    revalidatePath('/proveedores/perfil');
    revalidatePath(`/proveedores/${proveedorId}`);
    
    return { success: true, data: documento };
  } catch (error: any) {
    console.error('Error subiendo documento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDAR DOCUMENTOS (ADMIN) ====================

export async function validarDocumento(
  documentoId: string, 
  status: StatusDocumento,
  comentarios?: string,
  revisadoPor?: string
) {
  try {
    const documento = await database.getDocumento(documentoId);
    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }

    await database.updateDocumento(documentoId, {
      status,
      comentarios,
      revisadoPor,
      fechaRevision: new Date(),
      updatedAt: new Date()
    });

    // Si todos los documentos están aprobados, actualizar estado del proveedor
    if (status === 'aprobado') {
      await checkAndUpdateProveedorStatus(documento.proveedorId);
    }

    // Crear notificación para el proveedor
    await database.createNotificacion({
      usuarioId: documento.proveedorId,
      tipo: 'documento_validado',
      titulo: `Documento ${status === 'aprobado' ? 'aprobado' : 'rechazado'}`,
      mensaje: `Su ${documento.tipoDocumento} ha sido ${status}${comentarios ? `: ${comentarios}` : ''}`,
      leida: false,
      empresaId: documento.empresaId || ''
    });

    revalidatePath('/proveedores');
    revalidatePath(`/proveedores/${documento.proveedorId}`);
    
    return { success: true, message: 'Documento validado correctamente' };
  } catch (error: any) {
    console.error('Error validando documento:', error);
    return { success: false, error: error.message };
  }
}

export async function aprobarDocumento(documentoId: string, revisadoPor: string) {
  return await validarDocumento(documentoId, 'aprobado', undefined, revisadoPor);
}

export async function rechazarDocumento(documentoId: string, motivo: string, revisadoPor: string) {
  return await validarDocumento(documentoId, 'rechazado', motivo, revisadoPor);
}

// ==================== FUNCIONES DE APOYO ====================

async function checkAndUpdateProveedorStatus(proveedorId: string) {
  try {
    const documentos = await database.getDocumentosByProveedor(proveedorId);
    const documentosRequeridos = getDocumentosRequeridos(); // Implementar según tipo de proveedor
    
    const documentosAprobados = documentos.filter(doc => doc.status === 'aprobado');
    const documentosRechazados = documentos.filter(doc => doc.status === 'rechazado');
    
    let nuevoStatus: 'activo' | 'pendiente_validacion' | 'rechazado' | 'suspendido';
    
    if (documentosRechazados.length > 0) {
      nuevoStatus = 'rechazado';
    } else if (documentosAprobados.length >= documentosRequeridos.length) {
      nuevoStatus = 'activo';
    } else {
      nuevoStatus = 'pendiente_validacion';
    }
    
    await database.updateProveedorStatus(proveedorId, nuevoStatus);
    
  } catch (error) {
    console.error('Error actualizando status de proveedor:', error);
  }
}

function getDocumentosRequeridos(): TipoDocumentoProveedor[] {
  // Documentos básicos requeridos para todos los proveedores
  return [
    'acta_constitutiva',
    'comprobante_domicilio',
    'identificacion_representante',
    'constancia_fiscal',
    'caratula_bancaria'
  ];
}

// ==================== ALERTAS DE VENCIMIENTO ====================

export async function getDocumentosProximosAVencer(dias: number = 30, empresaId?: string) {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (dias * 24 * 60 * 60 * 1000));
    
    const documentos = await database.getDocumentosVenciendo(now, futureDate, empresaId);
    
    // Agrupar por días restantes
    const documentosAgrupados = {
      vencenHoy: documentos.filter(doc => {
        const vencimiento = new Date(doc.fechaVencimiento);
        return vencimiento.toDateString() === now.toDateString();
      }),
      vencenEn5Dias: documentos.filter(doc => {
        const vencimiento = new Date(doc.fechaVencimiento);
        const diffDays = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 5 && diffDays > 0;
      }),
      vencenEn15Dias: documentos.filter(doc => {
        const vencimiento = new Date(doc.fechaVencimiento);
        const diffDays = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 15 && diffDays > 5;
      }),
      vencenEn30Dias: documentos.filter(doc => {
        const vencimiento = new Date(doc.fechaVencimiento);
        const diffDays = Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 15;
      })
    };
    
    return { success: true, data: documentosAgrupados };
  } catch (error: any) {
    console.error('Error obteniendo documentos por vencer:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ELIMINAR DOCUMENTO ====================

export async function eliminarDocumento(documentoId: string) {
  try {
    const documento = await database.getDocumento(documentoId);
    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }

    // Eliminar archivo del storage
    await database.deleteFile(documento.archivoUrl);
    
    // Eliminar registro de la base de datos
    await database.deleteDocumento(documentoId);

    revalidatePath('/proveedores/perfil');
    revalidatePath(`/proveedores/${documento.proveedorId}`);
    
    return { success: true, message: 'Documento eliminado correctamente' };
  } catch (error: any) {
    console.error('Error eliminando documento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DESCARGAR DOCUMENTO ====================

export async function getDownloadUrl(documentoId: string) {
  try {
    const documento = await database.getDocumento(documentoId);
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