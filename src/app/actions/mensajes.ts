'use server';
// src/app/actions/mensajes.ts

import { database } from '@/lib/database';
import type { 
  Mensaje, 
  Conversacion, 
  ArchivoMensaje,
  ParticipanteConversacion 
} from '@/types/backend';
import { revalidatePath } from 'next/cache';

// ==================== CREAR CONVERSACIÓN ====================

export async function crearConversacion(data: {
  remitenteId: string;
  remitenteNombre: string;
  remitenteRol: string;
  destinatarioId: string;
  destinatarioNombre: string;
  destinatarioRol?: string;
  asunto: string;
  mensajeInicial: string;
  archivos?: File[];
  empresaId: string;
}) {
  try {
    // Verificar si ya existe una conversación activa entre estos usuarios
    const conversacionExistente = await database.getConversacionEntreUsuarios(
      data.remitenteId, 
      data.destinatarioId
    );

    let conversacion: Conversacion;

    if (conversacionExistente && conversacionExistente.activa) {
      // Usar conversación existente
      conversacion = conversacionExistente;
    } else {
      // Crear nueva conversación
      const participantes: ParticipanteConversacion[] = [
        {
          uid: data.remitenteId,
          nombre: data.remitenteNombre,
          rol: data.remitenteRol
        },
        {
          uid: data.destinatarioId,
          nombre: data.destinatarioNombre,
          rol: data.destinatarioRol || 'admin'
        }
      ];

      conversacion = await database.createConversacion({
        participantes: [data.remitenteId, data.destinatarioId],
        participantesInfo: participantes,
        asunto: data.asunto,
        activa: true,
        noLeidos: {
          [data.destinatarioId]: 0 // Se incrementará al enviar mensaje
        },
        empresaId: data.empresaId
      });
    }

    // Subir archivos si los hay
    let archivosSubidos: ArchivoMensaje[] = [];
    if (data.archivos && data.archivos.length > 0) {
      archivosSubidos = await Promise.all(
        data.archivos.map(async (archivo) => {
          const archivoUrl = await database.uploadArchivoMensaje(archivo, conversacion.id);
          return {
            nombre: archivo.name,
            url: archivoUrl,
            tipo: archivo.type,
            tamanio: archivo.size
          };
        })
      );
    }

    // Crear primer mensaje
    const mensaje = await database.createMensaje({
      conversacionId: conversacion.id,
      remitenteId: data.remitenteId,
      remitenteNombre: data.remitenteNombre,
      remitenteRol: data.remitenteRol,
      destinatarioId: data.destinatarioId,
      destinatarioNombre: data.destinatarioNombre,
      mensaje: data.mensajeInicial,
      asunto: data.asunto,
      archivos: archivosSubidos,
      leido: false
    });

    // Actualizar conversación con último mensaje
    await database.updateConversacion(conversacion.id, {
      ultimoMensaje: data.mensajeInicial,
      ultimoMensajeFecha: new Date(),
      ultimoMensajeRemitente: data.remitenteNombre,
      noLeidos: {
        ...conversacion.noLeidos,
        [data.destinatarioId]: (conversacion.noLeidos[data.destinatarioId] || 0) + 1
      },
      updatedAt: new Date()
    });

    // Crear notificación para el destinatario
    await database.createNotificacion({
      usuarioId: data.destinatarioId,
      tipo: 'nuevo_mensaje',
      titulo: 'Nuevo mensaje',
      mensaje: `Mensaje de ${data.remitenteNombre}: ${data.asunto}`,
      link: `/mensajeria?conversacion=${conversacion.id}`,
      leida: false,
      emailEnviado: false,
      empresaId: data.empresaId
    });

    revalidatePath('/mensajeria');
    revalidatePath('/proveedores/mensajeria');
    
    return { 
      success: true, 
      data: { 
        conversacion, 
        mensaje,
        conversacionId: conversacion.id 
      } 
    };
  } catch (error: any) {
    console.error('Error creando conversación:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ENVIAR MENSAJE ====================

export async function enviarMensaje(data: {
  conversacionId: string;
  remitenteId: string;
  remitenteNombre: string;
  remitenteRol: string;
  mensaje: string;
  archivos?: File[];
}) {
  try {
    // Verificar que la conversación existe y está activa
    const conversacion = await database.getConversacion(data.conversacionId);
    if (!conversacion || !conversacion.activa) {
      return { success: false, error: 'Conversación no encontrada o inactiva' };
    }

    // Verificar que el remitente es participante de la conversación
    if (!conversacion.participantes.includes(data.remitenteId)) {
      return { success: false, error: 'No autorizado para enviar mensajes en esta conversación' };
    }

    // Obtener destinatario (el otro participante)
    const destinatarioId = conversacion.participantes.find(p => p !== data.remitenteId);
    if (!destinatarioId) {
      return { success: false, error: 'Destinatario no encontrado' };
    }

    const destinatarioInfo = conversacion.participantesInfo.find(p => p.uid === destinatarioId);
    
    // Subir archivos si los hay
    let archivosSubidos: ArchivoMensaje[] = [];
    if (data.archivos && data.archivos.length > 0) {
      // Validar archivos
      for (const archivo of data.archivos) {
        if (archivo.size > 10 * 1024 * 1024) { // 10MB máximo
          return { success: false, error: `Archivo ${archivo.name} es muy grande. Máximo 10MB` };
        }
      }

      archivosSubidos = await Promise.all(
        data.archivos.map(async (archivo) => {
          const archivoUrl = await database.uploadArchivoMensaje(archivo, data.conversacionId);
          return {
            nombre: archivo.name,
            url: archivoUrl,
            tipo: archivo.type,
            tamanio: archivo.size
          };
        })
      );
    }

    // Crear mensaje
    const mensaje = await database.createMensaje({
      conversacionId: data.conversacionId,
      remitenteId: data.remitenteId,
      remitenteNombre: data.remitenteNombre,
      remitenteRol: data.remitenteRol,
      destinatarioId,
      destinatarioNombre: destinatarioInfo?.nombre || 'Usuario',
      mensaje: data.mensaje,
      archivos: archivosSubidos,
      leido: false
    });

    // Actualizar conversación
    await database.updateConversacion(data.conversacionId, {
      ultimoMensaje: data.mensaje,
      ultimoMensajeFecha: new Date(),
      ultimoMensajeRemitente: data.remitenteNombre,
      noLeidos: {
        ...conversacion.noLeidos,
        [destinatarioId]: (conversacion.noLeidos[destinatarioId] || 0) + 1
      },
      updatedAt: new Date()
    });

    // Crear notificación para el destinatario
    await database.createNotificacion({
      usuarioId: destinatarioId,
      tipo: 'nuevo_mensaje',
      titulo: 'Nuevo mensaje',
      mensaje: `Mensaje de ${data.remitenteNombre}`,
      link: `/mensajeria?conversacion=${data.conversacionId}`,
      leida: false,
      emailEnviado: false,
      empresaId: conversacion.empresaId || ''
    });

    revalidatePath('/mensajeria');
    revalidatePath('/proveedores/mensajeria');
    
    return { success: true, data: mensaje };
  } catch (error: any) {
    console.error('Error enviando mensaje:', error);
    return { success: false, error: error.message };
  }
}

// ==================== OBTENER CONVERSACIONES ====================

export async function getConversacionesByUsuario(usuarioId: string) {
  try {
    const conversaciones = await database.getConversacionesByUsuario(usuarioId);
    
    // Ordenar por fecha del último mensaje
    conversaciones.sort((a, b) => {
      const fechaA = new Date(a.ultimoMensajeFecha).getTime();
      const fechaB = new Date(b.ultimoMensajeFecha).getTime();
      return fechaB - fechaA; // Más reciente primero
    });
    
    return { success: true, data: conversaciones };
  } catch (error: any) {
    console.error('Error obteniendo conversaciones:', error);
    return { success: false, error: error.message };
  }
}

export async function getConversacion(conversacionId: string, usuarioId: string) {
  try {
    const conversacion = await database.getConversacion(conversacionId);
    
    if (!conversacion) {
      return { success: false, error: 'Conversación no encontrada' };
    }

    // Verificar que el usuario es participante
    if (!conversacion.participantes.includes(usuarioId)) {
      return { success: false, error: 'No autorizado para acceder a esta conversación' };
    }

    return { success: true, data: conversacion };
  } catch (error: any) {
    console.error('Error obteniendo conversación:', error);
    return { success: false, error: error.message };
  }
}

// ==================== OBTENER MENSAJES ====================

export async function getMensajesByConversacion(conversacionId: string, usuarioId: string, limit: number = 50, offset: number = 0) {
  try {
    // Verificar que el usuario puede acceder a esta conversación
    const conversacion = await database.getConversacion(conversacionId);
    if (!conversacion || !conversacion.participantes.includes(usuarioId)) {
      return { success: false, error: 'No autorizado para acceder a estos mensajes' };
    }

    const mensajes = await database.getMensajesByConversacion(conversacionId, limit, offset);
    
    // Ordenar por fecha (más antiguos primero para el chat)
    mensajes.sort((a, b) => {
      const fechaA = new Date(a.createdAt).getTime();
      const fechaB = new Date(b.createdAt).getTime();
      return fechaA - fechaB;
    });
    
    return { success: true, data: mensajes };
  } catch (error: any) {
    console.error('Error obteniendo mensajes:', error);
    return { success: false, error: error.message };
  }
}

// ==================== MARCAR MENSAJES COMO LEÍDOS ====================

export async function marcarMensajesComoLeidos(conversacionId: string, usuarioId: string) {
  try {
    // Verificar acceso a la conversación
    const conversacion = await database.getConversacion(conversacionId);
    if (!conversacion || !conversacion.participantes.includes(usuarioId)) {
      return { success: false, error: 'No autorizado' };
    }

    // Marcar mensajes como leídos
    await database.marcarMensajesComoLeidos(conversacionId, usuarioId);

    // Actualizar contador de no leídos en la conversación
    await database.updateConversacion(conversacionId, {
      noLeidos: {
        ...conversacion.noLeidos,
        [usuarioId]: 0
      },
      updatedAt: new Date()
    });

    revalidatePath('/mensajeria');
    revalidatePath('/proveedores/mensajeria');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error marcando mensajes como leídos:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ARCHIVAR CONVERSACIÓN ====================

export async function archivarConversacion(conversacionId: string, usuarioId: string) {
  try {
    const conversacion = await database.getConversacion(conversacionId);
    if (!conversacion || !conversacion.participantes.includes(usuarioId)) {
      return { success: false, error: 'No autorizado' };
    }

    await database.updateConversacion(conversacionId, {
      activa: false,
      updatedAt: new Date()
    });

    revalidatePath('/mensajeria');
    revalidatePath('/proveedores/mensajeria');
    
    return { success: true, message: 'Conversación archivada' };
  } catch (error: any) {
    console.error('Error archivando conversación:', error);
    return { success: false, error: error.message };
  }
}

// ==================== BUSCAR MENSAJES ====================

export async function buscarMensajes(usuarioId: string, query: string, conversacionId?: string) {
  try {
    const mensajes = await database.buscarMensajes(usuarioId, query, conversacionId);
    
    return { success: true, data: mensajes };
  } catch (error: any) {
    console.error('Error buscando mensajes:', error);
    return { success: false, error: error.message };
  }
}

// ==================== ESTADÍSTICAS DE MENSAJERÍA ====================

export async function getEstadisticasMensajeria(usuarioId: string, empresaId?: string) {
  try {
    const stats = await database.getEstadisticasMensajeria(usuarioId, empresaId);
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    return { success: false, error: error.message };
  }
}

// ==================== OBTENER USUARIOS PARA NUEVA CONVERSACIÓN ====================

export async function getUsuariosParaConversacion(usuarioId: string, empresaId: string, rol?: string) {
  try {
    // Si es proveedor, solo puede contactar admins de su empresa
    // Si es admin, puede contactar proveedores y otros admins
    const usuarios = await database.getUsuariosParaConversacion(usuarioId, empresaId, rol);
    
    return { success: true, data: usuarios };
  } catch (error: any) {
    console.error('Error obteniendo usuarios:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DESCARGAR ARCHIVO DE MENSAJE ====================

export async function getDownloadUrlMensaje(archivoUrl: string, usuarioId: string) {
  try {
    // Verificar que el usuario tiene acceso al archivo
    // (esto se debería hacer verificando que participa en la conversación del mensaje)
    
    const downloadUrl = await database.getDownloadUrl(archivoUrl);
    
    return { success: true, data: { url: downloadUrl } };
  } catch (error: any) {
    console.error('Error obteniendo URL de descarga:', error);
    return { success: false, error: error.message };
  }
}

// ==================== NOTIFICACIONES EN TIEMPO REAL ====================

export async function getMensajesNoLeidos(usuarioId: string) {
  try {
    const count = await database.getMensajesNoLeidosCount(usuarioId);
    
    return { success: true, data: { count } };
  } catch (error: any) {
    console.error('Error obteniendo mensajes no leídos:', error);
    return { success: false, error: error.message };
  }
}

// ==================== TEMPLATES DE MENSAJES ====================

export async function getTemplatesMensajes(rol: string) {
  try {
    const templates = [
      {
        id: 'consulta_oc',
        nombre: 'Consulta sobre Orden de Compra',
        asunto: 'Consulta - Orden de Compra #{ordenId}',
        mensaje: 'Buenos días,\n\nTengo una consulta respecto a la orden de compra #{ordenId}.\n\n[Escribir consulta aquí]\n\nQuedo atento a sus comentarios.\n\nSaludos cordiales.'
      },
      {
        id: 'problema_factura',
        nombre: 'Problema con Factura',
        asunto: 'Problema - Factura #{folioFactura}',
        mensaje: 'Buenos días,\n\nEstoy teniendo un problema con la factura #{folioFactura}.\n\n[Describir el problema]\n\nAgradezco su pronta atención.\n\nSaludos cordiales.'
      },
      {
        id: 'consulta_pago',
        nombre: 'Consulta sobre Pago',
        asunto: 'Consulta - Estado de Pago',
        mensaje: 'Buenos días,\n\nQuisiera consultar sobre el estado del pago correspondiente a la factura #{folioFactura}.\n\n¿Podrían proporcionarme información actualizada?\n\nGracias por su atención.\n\nSaludos cordiales.'
      }
    ];
    
    return { success: true, data: templates };
  } catch (error: any) {
    console.error('Error obteniendo templates:', error);
    return { success: false, error: error.message };
  }
}