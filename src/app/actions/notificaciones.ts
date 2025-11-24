'use server';
// src/app/actions/notificaciones.ts

import { database } from '@/lib/database';
import type { 
  Notificacion, 
  TipoNotificacion 
} from '@/types/backend';
import { revalidatePath } from 'next/cache';

// ==================== CREAR NOTIFICACIÓN ====================

export async function crearNotificacion(data: {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  link?: string;
  datos?: Record<string, any>;
  empresaId: string;
  enviarEmail?: boolean;
}) {
  try {
    const notificacion = await database.createNotificacion({
      usuarioId: data.usuarioId,
      tipo: data.tipo,
      titulo: data.titulo,
      mensaje: data.mensaje,
      link: data.link,
      datos: data.datos,
      leida: false,
      emailEnviado: false,
      empresaId: data.empresaId
    });

    // Si se solicita envío por email, programar envío
    if (data.enviarEmail) {
      await programarEnvioEmail(notificacion);
    }

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { success: true, data: notificacion };
  } catch (error: any) {
    console.error('Error creando notificación:', error);
    return { success: false, error: error.message };
  }
}

// ==================== OBTENER NOTIFICACIONES ====================

export async function getNotificacionesByUsuario(
  usuarioId: string, 
  filters?: {
    tipo?: TipoNotificacion;
    leida?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  try {
    const notificaciones = await database.getNotificacionesByUsuario(usuarioId, filters);
    
    // Ordenar por fecha (más recientes primero)
    notificaciones.sort((a, b) => {
      const fechaA = new Date(a.createdAt).getTime();
      const fechaB = new Date(b.createdAt).getTime();
      return fechaB - fechaA;
    });
    
    return { success: true, data: notificaciones };
  } catch (error: any) {
    console.error('Error obteniendo notificaciones:', error);
    return { success: false, error: error.message };
  }
}

export async function getNotificacionesNoLeidas(usuarioId: string) {
  try {
    const notificaciones = await database.getNotificacionesByUsuario(usuarioId, { leida: false });
    
    return { 
      success: true, 
      data: {
        notificaciones,
        count: notificaciones.length
      }
    };
  } catch (error: any) {
    console.error('Error obteniendo notificaciones no leídas:', error);
    return { success: false, error: error.message };
  }
}

// ==================== MARCAR COMO LEÍDA ====================

export async function marcarNotificacionComoLeida(notificacionId: string, usuarioId: string) {
  try {
    const notificacion = await database.getNotificacion(notificacionId);
    
    if (!notificacion) {
      return { success: false, error: 'Notificación no encontrada' };
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.usuarioId !== usuarioId) {
      return { success: false, error: 'No autorizado' };
    }

    await database.updateNotificacion(notificacionId, {
      leida: true,
      fechaLectura: new Date()
    });

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error marcando notificación como leída:', error);
    return { success: false, error: error.message };
  }
}

// ==================== MARCAR TODAS COMO LEÍDAS ====================

export async function marcarTodasNotificacionesComoLeidas(usuarioId: string) {
  try {
    await database.marcarTodasNotificacionesComoLeidas(usuarioId);

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { success: true, message: 'Todas las notificaciones marcadas como leídas' };
  } catch (error: any) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ELIMINAR NOTIFICACIÓN ====================

export async function eliminarNotificacion(notificacionId: string, usuarioId: string) {
  try {
    const notificacion = await database.getNotificacion(notificacionId);
    
    if (!notificacion) {
      return { success: false, error: 'Notificación no encontrada' };
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.usuarioId !== usuarioId) {
      return { success: false, error: 'No autorizado' };
    }

    await database.deleteNotificacion(notificacionId);

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { success: true, message: 'Notificación eliminada' };
  } catch (error: any) {
    console.error('Error eliminando notificación:', error);
    return { success: false, error: error.message };
  }
}

// ==================== LIMPIAR NOTIFICACIONES ANTIGUAS ====================

export async function limpiarNotificacionesAntiguas(usuarioId: string, diasAntiguedad: number = 30) {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const eliminadas = await database.deleteNotificacionesAntiguas(usuarioId, fechaLimite);

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { 
      success: true, 
      message: `${eliminadas} notificaciones eliminadas`,
      data: { eliminadas }
    };
  } catch (error: any) {
    console.error('Error limpiando notificaciones antiguas:', error);
    return { success: false, error: error.message };
  }
}

// ==================== NOTIFICACIONES AUTOMÁTICAS ====================

export async function crearNotificacionOrdenCompra(data: {
  proveedorId: string;
  ordenId: string;
  monto: number;
  empresaId: string;
  tipo: 'nueva' | 'aceptada' | 'rechazada' | 'completada';
}) {
  try {
    let titulo: string;
    let mensaje: string;
    let tipoNotif: TipoNotificacion = 'nueva_oc';

    switch (data.tipo) {
      case 'nueva':
        titulo = 'Nueva Orden de Compra';
        mensaje = `Se ha creado la orden de compra ${data.ordenId} por $${data.monto.toLocaleString()}`;
        break;
      case 'aceptada':
        titulo = 'Orden de Compra Aceptada';
        mensaje = `La orden de compra ${data.ordenId} ha sido aceptada`;
        break;
      case 'rechazada':
        titulo = 'Orden de Compra Rechazada';
        mensaje = `La orden de compra ${data.ordenId} ha sido rechazada`;
        break;
      case 'completada':
        titulo = 'Orden de Compra Completada';
        mensaje = `La orden de compra ${data.ordenId} ha sido marcada como completada`;
        break;
    }

    await crearNotificacion({
      usuarioId: data.proveedorId,
      tipo: tipoNotif,
      titulo,
      mensaje,
      link: `/proveedores/ordenes-de-compra/${data.ordenId}`,
      datos: { ordenId: data.ordenId, monto: data.monto },
      empresaId: data.empresaId,
      enviarEmail: true
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creando notificación de OC:', error);
    return { success: false, error: error.message };
  }
}

export async function crearNotificacionFactura(data: {
  proveedorId: string;
  facturaId: string;
  folio: string;
  empresaId: string;
  tipo: 'aprobada' | 'rechazada' | 'en_revision';
  motivo?: string;
}) {
  try {
    let titulo: string;
    let mensaje: string;
    let tipoNotif: TipoNotificacion;

    switch (data.tipo) {
      case 'aprobada':
        titulo = 'Factura Aprobada';
        mensaje = `Su factura ${data.folio} ha sido aprobada y está en proceso de pago`;
        tipoNotif = 'factura_aprobada';
        break;
      case 'rechazada':
        titulo = 'Factura Rechazada';
        mensaje = `Su factura ${data.folio} ha sido rechazada${data.motivo ? `: ${data.motivo}` : ''}`;
        tipoNotif = 'factura_rechazada';
        break;
      case 'en_revision':
        titulo = 'Factura En Revisión';
        mensaje = `Su factura ${data.folio} está siendo revisada por nuestro equipo`;
        tipoNotif = 'factura_aprobada'; // Usar el mismo tipo por ahora
        break;
    }

    await crearNotificacion({
      usuarioId: data.proveedorId,
      tipo: tipoNotif,
      titulo,
      mensaje,
      link: `/proveedores/facturacion`,
      datos: { facturaId: data.facturaId, folio: data.folio },
      empresaId: data.empresaId,
      enviarEmail: true
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creando notificación de factura:', error);
    return { success: false, error: error.message };
  }
}

export async function crearNotificacionPago(data: {
  proveedorId: string;
  pagoId: string;
  monto: number;
  empresaId: string;
  referencia?: string;
}) {
  try {
    await crearNotificacion({
      usuarioId: data.proveedorId,
      tipo: 'pago_recibido',
      titulo: 'Pago Realizado',
      mensaje: `Se ha procesado un pago de $${data.monto.toLocaleString()}${data.referencia ? ` - Ref: ${data.referencia}` : ''}`,
      link: `/proveedores/pagos`,
      datos: { pagoId: data.pagoId, monto: data.monto },
      empresaId: data.empresaId,
      enviarEmail: true
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creando notificación de pago:', error);
    return { success: false, error: error.message };
  }
}

export async function crearNotificacionDocumento(data: {
  proveedorId: string;
  documentoId: string;
  tipoDocumento: string;
  empresaId: string;
  tipo: 'validado' | 'rechazado' | 'por_vencer';
  motivo?: string;
}) {
  try {
    let titulo: string;
    let mensaje: string;
    let tipoNotif: TipoNotificacion;

    switch (data.tipo) {
      case 'validado':
        titulo = 'Documento Aprobado';
        mensaje = `Su ${data.tipoDocumento} ha sido aprobado`;
        tipoNotif = 'documento_validado';
        break;
      case 'rechazado':
        titulo = 'Documento Rechazado';
        mensaje = `Su ${data.tipoDocumento} ha sido rechazado${data.motivo ? `: ${data.motivo}` : ''}`;
        tipoNotif = 'documento_rechazado';
        break;
      case 'por_vencer':
        titulo = 'Documento por Vencer';
        mensaje = `Su ${data.tipoDocumento} está próximo a vencer. Por favor actualícelo`;
        tipoNotif = 'documento_validado'; // Usar el mismo tipo por ahora
        break;
    }

    await crearNotificacion({
      usuarioId: data.proveedorId,
      tipo: tipoNotif,
      titulo,
      mensaje,
      link: `/proveedores/perfil`,
      datos: { documentoId: data.documentoId, tipoDocumento: data.tipoDocumento },
      empresaId: data.empresaId,
      enviarEmail: data.tipo !== 'por_vencer' // No enviar email por vencimiento
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creando notificación de documento:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS DE NOTIFICACIONES ====================

export async function getEstadisticasNotificaciones(usuarioId: string, empresaId?: string) {
  try {
    const notificaciones = await database.getNotificacionesByUsuario(usuarioId);
    
    const stats = {
      total: notificaciones.length,
      noLeidas: notificaciones.filter(n => !n.leida).length,
      porTipo: {} as Record<TipoNotificacion, number>,
      ultimaSemana: notificaciones.filter(n => {
        const fecha = new Date(n.createdAt);
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        return fecha >= hace7Dias;
      }).length
    };

    // Contar por tipo
    notificaciones.forEach(notificacion => {
      stats.porTipo[notificacion.tipo] = (stats.porTipo[notificacion.tipo] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CONFIGURACIÓN DE PREFERENCIAS ====================

export async function updatePreferenciasNotificaciones(data: {
  usuarioId: string;
  preferencias: {
    emailOrdenesCompra: boolean;
    emailFacturas: boolean;
    emailPagos: boolean;
    emailMensajes: boolean;
    emailDocumentos: boolean;
    pushNotifications: boolean;
  };
}) {
  try {
    await database.updatePreferenciasNotificaciones(data.usuarioId, data.preferencias);

    revalidatePath('/notificaciones');
    revalidatePath('/proveedores/notificaciones');
    
    return { success: true, message: 'Preferencias actualizadas' };
  } catch (error: any) {
    console.error('Error actualizando preferencias:', error);
    return { success: false, error: error.message };
  }
}

export async function getPreferenciasNotificaciones(usuarioId: string) {
  try {
    const preferencias = await database.getPreferenciasNotificaciones(usuarioId);
    
    // Preferencias por defecto si no existen
    const defaultPrefs = {
      emailOrdenesCompra: true,
      emailFacturas: true,
      emailPagos: true,
      emailMensajes: false,
      emailDocumentos: true,
      pushNotifications: true
    };

    return { success: true, data: preferencias || defaultPrefs };
  } catch (error: any) {
    console.error('Error obteniendo preferencias:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ENVÍO DE EMAILS ====================

async function programarEnvioEmail(notificacion: Notificacion) {
  try {
    // Verificar preferencias del usuario
    const preferencias = await database.getPreferenciasNotificaciones(notificacion.usuarioId);
    
    if (!preferencias) {
      // Si no hay preferencias, enviar por defecto
      await enviarEmailNotificacion(notificacion);
      return;
    }

    // Verificar si el usuario quiere recibir emails para este tipo de notificación
    let debeEnviar = false;
    switch (notificacion.tipo) {
      case 'nueva_oc':
        debeEnviar = preferencias.emailOrdenesCompra;
        break;
      case 'factura_aprobada':
      case 'factura_rechazada':
        debeEnviar = preferencias.emailFacturas;
        break;
      case 'pago_recibido':
        debeEnviar = preferencias.emailPagos;
        break;
      case 'nuevo_mensaje':
        debeEnviar = preferencias.emailMensajes;
        break;
      case 'documento_validado':
      case 'documento_rechazado':
        debeEnviar = preferencias.emailDocumentos;
        break;
      default:
        debeEnviar = true; // Para tipos de sistema, siempre enviar
    }

    if (debeEnviar) {
      await enviarEmailNotificacion(notificacion);
    }
  } catch (error) {
    console.error('Error programando envío de email:', error);
  }
}

async function enviarEmailNotificacion(notificacion: Notificacion) {
  try {
    // Aquí implementarías la integración con tu servicio de email
    // (SendGrid, Azure Email Service, etc.)
    
    // Por ahora solo marcar como enviado
    await database.updateNotificacion(notificacion.id, {
      emailEnviado: true,
      fechaEnvioEmail: new Date()
    });
    
    console.log(`Email enviado para notificación ${notificacion.id}`);
  } catch (error) {
    console.error('Error enviando email:', error);
  }
}

// ==================== NOTIFICACIONES PUSH ====================

export async function enviarNotificacionPush(data: {
  usuarioId: string;
  titulo: string;
  mensaje: string;
  link?: string;
  icon?: string;
}) {
  try {
    // Aquí implementarías las notificaciones push del navegador
    // o integración con servicios como Firebase Cloud Messaging
    
    console.log(`Push notification enviada a usuario ${data.usuarioId}: ${data.titulo}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error enviando notificación push:', error);
    return { success: false, error: error.message };
  }
}