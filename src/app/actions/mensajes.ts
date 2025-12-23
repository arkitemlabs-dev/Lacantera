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
    console.log('📨 crearConversacion - Datos recibidos:');
    console.log('  - Remitente ID:', data.remitenteId);
    console.log('  - Remitente Nombre:', data.remitenteNombre);
    console.log('  - Remitente Rol:', data.remitenteRol);
    console.log('  - Destinatario ID:', data.destinatarioId);
    console.log('  - Destinatario Nombre:', data.destinatarioNombre);
    console.log('  - Asunto:', data.asunto);

    // Verificar si ya existe una conversación activa entre estos usuarios
    const conversacionExistente = await database.getConversacionEntreUsuarios(
      data.remitenteId,
      data.destinatarioId
    );

    let conversacion: Conversacion;

    if (conversacionExistente && conversacionExistente.activa) {
      // Usar conversación existente
      console.log('📨 Usando conversación existente:', conversacionExistente.id);
      conversacion = conversacionExistente;
    } else {
      // Crear nueva conversación
      const participantesIds = [data.remitenteId, data.destinatarioId];
      const participantes: ParticipanteConversacion[] = [
        {
          uid: data.remitenteId,
          nombre: data.remitenteNombre,
          rol: data.remitenteRol
        },
        {
          uid: data.destinatarioId,
          nombre: data.destinatarioNombre,
          rol: data.destinatarioRol || 'proveedor'
        }
      ];

      console.log('📨 Creando nueva conversación con participantes:', participantesIds);

      conversacion = await database.createConversacion({
        participantes: participantesIds,
        participantesInfo: participantes,
        asunto: data.asunto,
        activa: true,
        noLeidos: {
          [data.destinatarioId]: 0 // Se incrementará al enviar mensaje
        },
        empresaId: data.empresaId
      });

      console.log('📨 Conversación creada con ID:', conversacion.id);
      console.log('📨 Participantes guardados:', conversacion.participantes);
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
    const conversacionActualizada = {
      ...conversacion,
      ultimoMensaje: data.mensajeInicial,
      ultimoMensajeFecha: new Date(),
      ultimoMensajeRemitente: data.remitenteNombre,
      noLeidos: {
        ...conversacion.noLeidos,
        [data.destinatarioId]: (conversacion.noLeidos[data.destinatarioId] || 0) + 1
      },
      updatedAt: new Date()
    };

    await database.updateConversacion(conversacion.id, {
      ultimoMensaje: data.mensajeInicial,
      ultimoMensajeFecha: conversacionActualizada.ultimoMensajeFecha,
      ultimoMensajeRemitente: data.remitenteNombre,
      noLeidos: conversacionActualizada.noLeidos,
      updatedAt: conversacionActualizada.updatedAt
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
        conversacion: conversacionActualizada,
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
    console.log('📬 getConversacionesByUsuario - Buscando conversaciones para usuario:', usuarioId);

    const conversaciones = await database.getConversacionesByUsuario(usuarioId);

    console.log('📬 Conversaciones encontradas:', conversaciones.length);
    if (conversaciones.length > 0) {
      conversaciones.forEach((c, i) => {
        console.log(`  📧 [${i}] ID: ${c.id}, Asunto: ${c.asunto}, Participantes:`, c.participantes);
      });
    }

    // Ordenar por fecha del último mensaje
    conversaciones.sort((a, b) => {
      const fechaA = new Date(a.ultimoMensajeFecha).getTime();
      const fechaB = new Date(b.ultimoMensajeFecha).getTime();
      return fechaB - fechaA; // Más reciente primero
    });

    return { success: true, data: conversaciones };
  } catch (error: any) {
    console.error('❌ Error obteniendo conversaciones:', error);
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
    console.log('🔍 getUsuariosParaConversacion ejecutándose con:', { usuarioId, empresaId, rol });

    // Si es Super Admin o Admin, obtener proveedores que tienen cuenta en el portal
    if (rol === 'super-admin' || rol === 'admin' || rol === 'Super Admin' || rol === 'Admin') {
      console.log('✅ Es Admin, obteniendo proveedores con cuenta en el portal');

      const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

      // 🔥 PRIMERO: Buscar en WebUsuario (sistema nuevo) - proveedores con campo Proveedor no vacío
      console.log('🔍 Buscando en WebUsuario (sistema nuevo)...');
      const webUsuarioResult = await hybridDB.queryPortal(`
        SELECT
          UsuarioWeb as id,
          Nombre as nombre,
          eMail as email,
          Proveedor as codigoProveedor,
          'Proveedor' as rol
        FROM WebUsuario
        WHERE Proveedor IS NOT NULL
          AND Proveedor != ''
          AND Estatus = 'ACTIVO'
          AND Nombre IS NOT NULL
          AND Nombre != ''
        ORDER BY Nombre ASC
      `);

      if (webUsuarioResult.recordset && webUsuarioResult.recordset.length > 0) {
        console.log('📦 Proveedores de WebUsuario encontrados:', webUsuarioResult.recordset.length);
        return { success: true, data: webUsuarioResult.recordset };
      }

      // 🔥 SEGUNDO: Si no hay en WebUsuario, buscar en pNetUsuario (sistema antiguo)
      console.log('🔍 Buscando en pNetUsuario (sistema antiguo)...');
      const portalResult = await hybridDB.queryPortal(`
        SELECT
          u.IDUsuario as id,
          u.Nombre as nombre,
          u.eMail as email,
          u.Usuario as codigoProveedor,
          'Proveedor' as rol
        FROM pNetUsuario u
        WHERE u.IDUsuarioTipo = 4
          AND u.Estatus = 'ALTA'
          AND u.Nombre IS NOT NULL
          AND u.Nombre != ''
        ORDER BY u.Nombre ASC
      `);

      // Si hay proveedores en pNetUsuario, usarlos
      if (portalResult.recordset && portalResult.recordset.length > 0) {
        console.log('📦 Proveedores de pNetUsuario encontrados:', portalResult.recordset.length);
        return { success: true, data: portalResult.recordset };
      }

      // 🔥 TERCERO: Si no hay proveedores en el portal, obtener del ERP como fallback
      console.log('⚠️ No hay proveedores en portal, usando ERP como fallback');
      const erpResult = await hybridDB.queryERP('la-cantera', `
        SELECT
          p.Proveedor as id,
          p.Nombre as nombre,
          COALESCE(p.eMail1, 'sin-email@proveedor.com') as email,
          'Proveedor' as rol
        FROM Prov p
        WHERE UPPER(p.Estatus) = 'ALTA'
          AND p.Nombre IS NOT NULL
          AND p.Nombre != ''
        ORDER BY p.Nombre ASC
      `);

      console.log('📦 Proveedores del ERP encontrados:', erpResult.recordset.length);
      return { success: true, data: erpResult.recordset };
    }

    // Si es proveedor, obtener administradores para que pueda escribirles
    if (rol === 'proveedor') {
      console.log('🔍 Es Proveedor, obteniendo administradores...');

      const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

      // Buscar administradores en WebUsuario
      const adminsResult = await hybridDB.queryPortal(`
        SELECT
          UsuarioWeb as id,
          Nombre as nombre,
          eMail as email,
          'Admin' as rol
        FROM WebUsuario
        WHERE (Rol = 'super-admin' OR Rol = 'admin')
          AND Estatus = 'ACTIVO'
          AND Nombre IS NOT NULL
          AND Nombre != ''
        ORDER BY Nombre ASC
      `);

      if (adminsResult.recordset && adminsResult.recordset.length > 0) {
        console.log('📦 Administradores encontrados:', adminsResult.recordset.length);
        return { success: true, data: adminsResult.recordset };
      }

      console.log('⚠️ No se encontraron administradores');
      return { success: true, data: [] };
    }

    console.log('❌ Rol no reconocido, usando implementación original');
    // Para otros roles, usar la implementación original
    const usuarios = await database.getUsuariosParaConversacion(usuarioId, empresaId, rol);

    return { success: true, data: usuarios };
  } catch (error: any) {
    console.error('💥 Error obteniendo usuarios:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DEBUG: VER TODAS LAS CONVERSACIONES ====================

export async function debugGetAllConversaciones() {
  try {
    const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

    const result = await hybridDB.queryPortal(`
      SELECT TOP 20
        ID,
        Participantes,
        ParticipantesInfo,
        Asunto,
        UltimoMensaje,
        Activa,
        CreatedAt
      FROM WebConversacion
      ORDER BY CreatedAt DESC
    `);

    console.log('🔍 DEBUG - Todas las conversaciones en la BD:');
    result.recordset.forEach((c: any, i: number) => {
      console.log(`  [${i}] ID: ${c.ID}`);
      console.log(`      Participantes: ${c.Participantes}`);
      console.log(`      Asunto: ${c.Asunto}`);
      console.log(`      Activa: ${c.Activa}`);
    });

    return { success: true, data: result.recordset };
  } catch (error: any) {
    console.error('Error en debug:', error);
    return { success: false, error: error.message };
  }
}

// ==================== DEBUG: CORREGIR CONVERSACIÓN ====================

export async function debugFixConversacion(conversacionId: string, oldUserId: string, newUserId: string, newUserName?: string) {
  try {
    const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

    // Obtener conversación actual
    const current = await hybridDB.queryPortal(`
      SELECT Participantes, ParticipantesInfo FROM WebConversacion WHERE ID = @id
    `, { id: parseInt(conversacionId) });

    if (current.recordset.length === 0) {
      return { success: false, error: 'Conversación no encontrada' };
    }

    const row = current.recordset[0];
    let participantes = JSON.parse(row.Participantes || '[]');
    let participantesInfo = JSON.parse(row.ParticipantesInfo || '[]');

    // Reemplazar el ID viejo por el nuevo
    participantes = participantes.map((p: string) => p === oldUserId ? newUserId : p);
    participantesInfo = participantesInfo.map((p: any) => {
      if (p.uid === oldUserId) {
        return { ...p, uid: newUserId, nombre: newUserName || p.nombre };
      }
      return p;
    });

    // Actualizar en la BD
    await hybridDB.queryPortal(`
      UPDATE WebConversacion
      SET Participantes = @participantes, ParticipantesInfo = @participantesInfo
      WHERE ID = @id
    `, {
      id: parseInt(conversacionId),
      participantes: JSON.stringify(participantes),
      participantesInfo: JSON.stringify(participantesInfo)
    });

    // También actualizar los mensajes
    await hybridDB.queryPortal(`
      UPDATE WebMensaje
      SET DestinatarioId = @newId
      WHERE ConversacionId = @convId AND DestinatarioId = @oldId
    `, {
      convId: parseInt(conversacionId),
      oldId: oldUserId,
      newId: newUserId
    });

    console.log(`✅ Conversación ${conversacionId} corregida: ${oldUserId} → ${newUserId}`);

    return { success: true, message: `Conversación actualizada: ${oldUserId} → ${newUserId}` };
  } catch (error: any) {
    console.error('Error corrigiendo conversación:', error);
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