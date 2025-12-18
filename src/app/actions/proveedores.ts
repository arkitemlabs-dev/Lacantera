'use server';
// src/app/actions/proveedores.ts

import { database } from '@/lib/database';
import type { ProveedorUser, DocumentoProveedor, StatusDocumento } from '@/types/backend';
import type { ProveedorFilters } from '@/lib/database';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER PROVEEDORES ====================

export async function getProveedor(uid: string) {
  try {
    const proveedor = await database.getProveedor(uid);
    if (!proveedor) {
      return { success: false, error: 'Proveedor no encontrado' };
    }
    return { success: true, data: proveedor };
  } catch (error: any) {
    console.error('Error obteniendo proveedor:', error);
    return { success: false, error: error.message };
  }
}

export async function getProveedores(filters?: ProveedorFilters) {
  try {
    console.log('[ACTION] getProveedores - iniciando con filtros:', filters);
    const proveedores = await database.getProveedores(filters);

    // Log de resumen
    const registrados = proveedores.filter(p => p.registradoEnPortal === true).length;
    const noRegistrados = proveedores.filter(p => p.registradoEnPortal === false).length;
    console.log(`[ACTION] getProveedores - Total: ${proveedores.length}, Registrados: ${registrados}, No registrados: ${noRegistrados}`);

    // Log de algunos ejemplos
    if (proveedores.length > 0) {
      const ejemplos = proveedores.slice(0, 3).map(p => ({
        codigo: p.codigoERP,
        nombre: p.razonSocial?.substring(0, 30),
        registrado: p.registradoEnPortal,
        uid: p.uid
      }));
      console.log('[ACTION] Ejemplos de proveedores:', JSON.stringify(ejemplos, null, 2));
    }

    return { success: true, data: proveedores };
  } catch (error: any) {
    console.error('Error obteniendo proveedores:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ACTUALIZAR PROVEEDOR ====================

export async function updateProveedorPerfil(
  uid: string,
  data: {
    displayName?: string;
    telefono?: string;
    direccion?: {
      calle: string;
      ciudad: string;
      estado: string;
      cp: string;
    };
  }
) {
  try {
    await database.updateProveedor(uid, data);

    revalidatePath('/proveedores/perfil');
    revalidatePath(`/proveedores/${uid}`);

    return {
      success: true,
      data: { message: 'Perfil actualizado exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando perfil:', error);
    return { success: false, error: error.message };
  }
}

export async function updateProveedorStatus(
  uid: string,
  status: ProveedorUser['status']
) {
  try {
    await database.updateProveedorStatus(uid, status);

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores');
    revalidatePath(`/proveedores/${uid}`);

    return {
      success: true,
      data: { message: 'Status actualizado exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando status:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DOCUMENTOS ====================

export async function getDocumentosByProveedor(proveedorId: string) {
  try {
    const documentos = await database.getDocumentosByProveedor(proveedorId);
    return { success: true, data: documentos };
  } catch (error: any) {
    console.error('Error obteniendo documentos:', error);
    return { success: false, error: error.message };
  }
}

export async function createDocumento(data: {
  proveedorId: string;
  tipoDocumento:
    | 'acta_constitutiva'
    | 'comprobante_domicilio'
    | 'identificacion_representante'
    | 'constancia_fiscal'
    | 'caratula_bancaria';
  archivoUrl: string;
  archivoNombre: string;
  archivoTipo: string;
}) {
  try {
    const documentoData: Omit<DocumentoProveedor, 'id'> = {
      ...data,
      status: 'pendiente',
      uploadedAt: new Date(),
    };

    const id = await database.createDocumento(documentoData);

    // TODO: Crear notificación para admin

    revalidatePath('/proveedores/perfil');
    revalidatePath(`/proveedores/${data.proveedorId}`);

    return {
      success: true,
      data: { id, message: 'Documento subido exitosamente' },
    };
  } catch (error: any) {
    console.error('Error subiendo documento:', error);
    return { success: false, error: error.message };
  }
}

export async function updateDocumentoStatus(
  id: string,
  status: StatusDocumento,
  comentarios?: string,
  revisadoPor?: string
) {
  try {
    const updateData: Partial<DocumentoProveedor> = {
      status,
      comentarios,
      revisadoPor,
      fechaRevision: new Date(),
      updatedAt: new Date(),
    };

    await database.updateDocumento(id, updateData);

    // TODO: Crear notificación para proveedor

    revalidatePath('/proveedores');

    return {
      success: true,
      data: { message: 'Documento actualizado exitosamente' },
    };
  } catch (error: any) {
    console.error('Error actualizando documento:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDocumento(id: string) {
  try {
    await database.deleteDocumento(id);

    revalidatePath('/proveedores/perfil');

    return {
      success: true,
      data: { message: 'Documento eliminado exitosamente' },
    };
  } catch (error: any) {
    console.error('Error eliminando documento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDACIÓN DE DOCUMENTOS ====================

export async function validarTodosLosDocumentos(proveedorId: string) {
  try {
    const documentos = await database.getDocumentosByProveedor(proveedorId);

    const tiposRequeridos = [
      'acta_constitutiva',
      'comprobante_domicilio',
      'identificacion_representante',
      'constancia_fiscal',
      'caratula_bancaria',
    ];

    const todosSubidos = tiposRequeridos.every((tipo) =>
      documentos.some((doc) => doc.tipoDocumento === tipo)
    );

    const todosAprobados = documentos.every((doc) => doc.status === 'aprobado');

    const documentosValidados = todosSubidos && todosAprobados;

    // Actualizar estado del proveedor
    await database.updateProveedor(proveedorId, {
      documentosValidados,
      status: documentosValidados ? 'activo' : 'pendiente_validacion',
    });

    revalidatePath('/proveedores');
    revalidatePath(`/proveedores/${proveedorId}`);

    return {
      success: true,
      data: {
        documentosValidados,
        todosSubidos,
        todosAprobados,
      },
    };
  } catch (error: any) {
    console.error('Error validando documentos:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS ====================

export async function getEstadisticasProveedor(proveedorId: string) {
  try {
    // Obtener facturas del proveedor
    const facturas = await database.getFacturasByProveedor(proveedorId);
    const ordenes = await database.getOrdenesCompraByProveedor(proveedorId);
    const documentos = await database.getDocumentosByProveedor(proveedorId);

    const totalFacturas = facturas.length;
    const facturasPendientes = facturas.filter(
      (f) => f.status === 'pendiente_revision'
    ).length;
    const facturasPagadas = facturas.filter((f) => f.status === 'pagada').length;

    const totalOrdenes = ordenes.length;
    const ordenesPendientes = ordenes.filter(
      (o) => o.status === 'pendiente_aceptacion'
    ).length;
    const ordenesCompletadas = ordenes.filter((o) => o.status === 'completada').length;

    const documentosPendientes = documentos.filter(
      (d) => d.status === 'pendiente'
    ).length;
    const documentosAprobados = documentos.filter(
      (d) => d.status === 'aprobado'
    ).length;

    const montoTotalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
    const montoPagado = facturas
      .filter((f) => f.pagada)
      .reduce((sum, f) => sum + f.total, 0);
    const montoPendiente = montoTotalFacturado - montoPagado;

    return {
      success: true,
      data: {
        facturas: {
          total: totalFacturas,
          pendientes: facturasPendientes,
          pagadas: facturasPagadas,
        },
        ordenes: {
          total: totalOrdenes,
          pendientes: ordenesPendientes,
          completadas: ordenesCompletadas,
        },
        documentos: {
          pendientes: documentosPendientes,
          aprobados: documentosAprobados,
        },
        montos: {
          totalFacturado: montoTotalFacturado,
          pagado: montoPagado,
          pendiente: montoPendiente,
        },
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
}

export async function getEstadisticasGenerales() {
  try {
    const proveedores = await database.getProveedores();
    const totalProveedores = proveedores.length;
    const activos = proveedores.filter((p) => p.status === 'activo').length;
    const pendientes = proveedores.filter(
      (p) => p.status === 'pendiente_validacion'
    ).length;
    const suspendidos = proveedores.filter((p) => p.status === 'suspendido').length;

    return {
      success: true,
      data: {
        totalProveedores,
        activos,
        pendientes,
        suspendidos,
      },
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas generales:', error);
    return { success: false, error: error.message };
  }
}