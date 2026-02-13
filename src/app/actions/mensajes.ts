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
import { NotificationService } from '@/lib/services/notification-service';

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

    // Crear notificación (no bloquea el envío del mensaje si falla)
    try {
      await NotificationService.enviarNotificacionMensaje({
        destinatarioId: data.destinatarioId,
        remitenteNombre: data.remitenteNombre,
        asunto: data.asunto,
        empresaId: data.empresaId,
        conversacionId: conversacion.id
      });
    } catch (notifError: any) {
      console.warn('[mensajes] Notificación no enviada:', notifError.message);
    }

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

    // Crear notificación (no bloquea el envío del mensaje si falla)
    try {
      await NotificationService.enviarNotificacionMensaje({
        destinatarioId: destinatarioId,
        remitenteNombre: data.remitenteNombre,
        asunto: 'Nuevo mensaje',
        empresaId: conversacion.empresaId || '',
        conversacionId: data.conversacionId
      });
    } catch (notifError: any) {
      console.warn('[mensajes] Notificación no enviada:', notifError.message);
    }

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
    // Normalizar rol: lowercase + espacios a guiones (frontend envía "Super Admin", backend usa "super-admin")
    const rolNorm = (rol || '').toLowerCase().replace(/\s+/g, '-');
    console.log('🔍 getUsuariosParaConversacion ejecutándose con:', { usuarioId, empresaId, rol, rolNorm });

    // Si es admin (cualquier variante), obtener proveedores que tienen cuenta en el portal
    const esAdmin = ['super-admin', 'admin', 'compras', 'contabilidad', 'solo-lectura'].includes(rolNorm);
    if (esAdmin) {
      console.log('✅ Es Admin, obteniendo proveedores con cuenta en el portal');

      const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

      // Buscar proveedores en WebUsuario (tabla única de usuarios)
      console.log('[mensajes] Buscando proveedores en WebUsuario...');

      const webUsuarioResult = await hybridDB.queryPortal(`
        SELECT
          CAST(UsuarioWeb AS NVARCHAR(100)) as id,
          Nombre as nombre,
          eMail as email,
          Proveedor as codigoProveedor,
          'Proveedor' as rol,
          'WebUsuario' as origen
        FROM WebUsuario
        WHERE Proveedor IS NOT NULL
          AND Proveedor != ''
          AND Estatus = 'ACTIVO'
          AND Rol = 'proveedor'
          AND Nombre IS NOT NULL
          AND Nombre != ''
      `);

      const proveedoresMap = new Map<string, any>();

      if (webUsuarioResult.recordset) {
        for (const prov of webUsuarioResult.recordset) {
          const emailKey = (prov.email || '').toLowerCase();
          if (emailKey && !proveedoresMap.has(emailKey)) {
            proveedoresMap.set(emailKey, prov);
          }
        }
        console.log('[mensajes] Proveedores encontrados en WebUsuario:', webUsuarioResult.recordset.length);
      }

      // Enriquecer con nombre de empresa del ERP usando portal_proveedor_mapping
      try {
        // 1. Obtener mappings activos (vínculo portal_user_id → erp_proveedor_code)
        const mappingResult = await hybridDB.queryPortal(`
          SELECT portal_user_id, erp_proveedor_code, empresa_code
          FROM portal_proveedor_mapping
          WHERE activo = 1
        `);

        if (mappingResult.recordset?.length > 0) {
          // Agrupar por portal_user_id, priorizando empresas prod sobre test
          const userErpCodes = new Map<string, string>();
          for (const m of mappingResult.recordset) {
            const userId = String(m.portal_user_id);
            const isProd = !m.empresa_code.includes('test');
            // Solo sobrescribir si no tenemos uno de prod aún
            if (!userErpCodes.has(userId) || isProd) {
              userErpCodes.set(userId, m.erp_proveedor_code);
            }
          }

          // 2. Recopilar códigos ERP únicos para buscar en el ERP
          const erpCodes = [...new Set(userErpCodes.values())];
          if (erpCodes.length > 0) {
            const erpCodesList = erpCodes.map(c => `'${c}'`).join(',');
            const erpResult = await hybridDB.queryERP('la-cantera', `
              SELECT Proveedor as codigo, Nombre as nombreEmpresa, RFC
              FROM Prov
              WHERE Proveedor IN (${erpCodesList})
            `);

            const erpMap = new Map<string, any>();
            for (const erp of (erpResult.recordset || [])) {
              erpMap.set(erp.codigo, erp);
            }

            // 3. Actualizar nombres en proveedoresMap
            for (const [key, prov] of proveedoresMap) {
              const erpCode = userErpCodes.get(String(prov.id));
              if (erpCode) {
                const erpData = erpMap.get(erpCode);
                if (erpData) {
                  prov.nombreEmpresa = erpData.nombreEmpresa;
                  prov.rfc = erpData.RFC;
                  prov.erpCode = erpCode;
                  prov.nombre = `${erpData.nombreEmpresa} (${prov.nombre})`;
                }
              }
            }
            console.log('📦 Proveedores enriquecidos con ERP via mapping:', erpCodes.length);
          }
        }
      } catch (enrichError) {
        console.log('⚠️ No se pudo enriquecer con ERP:', enrichError);
      }

      // Convertir a array y ordenar por nombre
      const proveedoresCombinados = Array.from(proveedoresMap.values())
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));

      console.log('📦 Total proveedores combinados:', proveedoresCombinados.length);

      if (proveedoresCombinados.length > 0) {
        return { success: true, data: proveedoresCombinados };
      }

      // FALLBACK: Si no hay proveedores en el portal, obtener del ERP
      console.log('⚠️ No hay proveedores en portal, usando ERP como fallback');
      const erpResult = await hybridDB.queryERP('la-cantera', `
        SELECT
          p.Proveedor as id,
          p.Nombre as nombre,
          COALESCE(p.eMail1, 'sin-email@proveedor.com') as email,
          'Proveedor' as rol,
          'ERP' as origen
        FROM Prov p
        WHERE UPPER(p.Estatus) = 'ALTA'
          AND p.Nombre IS NOT NULL
          AND p.Nombre != ''
        ORDER BY p.Nombre ASC
      `);

      console.log('📦 Proveedores del ERP encontrados:', erpResult.recordset.length);
      return { success: true, data: erpResult.recordset };
    }

    // Si es proveedor, obtener todos los usuarios internos de la empresa (admin, finanzas, etc.)
    if (rolNorm === 'proveedor') {
      console.log('🔍 Es Proveedor, obteniendo usuarios internos de la empresa...');

      const { hybridDB } = await import('@/lib/database/multi-tenant-connection');

      // Buscar todos los usuarios internos en WebUsuario (no proveedores, no clientes)
      const usuariosResult = await hybridDB.queryPortal(`
        SELECT
          UsuarioWeb as id,
          Nombre as nombre,
          eMail as email,
          Rol as rolOriginal,
          CASE
            WHEN Rol = 'super-admin' THEN 'Super Admin'
            WHEN Rol = 'admin' THEN 'Administrador'
            WHEN Rol = 'finanzas' THEN 'Finanzas'
            WHEN Rol = 'compras' THEN 'Compras'
            WHEN Rol = 'almacen' THEN 'Almacén'
            WHEN Rol = 'contabilidad' THEN 'Contabilidad'
            ELSE UPPER(LEFT(Rol, 1)) + LOWER(SUBSTRING(Rol, 2, LEN(Rol)))
          END as rol
        FROM WebUsuario
        WHERE Estatus = 'ACTIVO'
          AND Nombre IS NOT NULL
          AND Nombre != ''
          AND (Proveedor IS NULL OR Proveedor = '')
          AND (Cliente IS NULL OR Cliente = '')
        ORDER BY
          CASE Rol
            WHEN 'super-admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'finanzas' THEN 3
            WHEN 'compras' THEN 4
            WHEN 'almacen' THEN 5
            WHEN 'contabilidad' THEN 6
            ELSE 7
          END,
          Nombre ASC
      `);

      if (usuariosResult.recordset && usuariosResult.recordset.length > 0) {
        console.log('📦 Usuarios internos encontrados:', usuariosResult.recordset.length);
        return { success: true, data: usuariosResult.recordset };
      }

      console.log('⚠️ No se encontraron usuarios internos');
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

// ==================== SINCRONIZAR PROVEEDORES PARA MENSAJERÍA ====================

/**
 * @deprecated Ya no es necesaria. Todos los usuarios ahora viven en WebUsuario.
 * Se mantiene para compatibilidad por si algún endpoint la llama.
 */
export async function sincronizarProveedoresParaMensajeria() {
  return {
    success: true,
    message: 'Todos los usuarios ya están unificados en WebUsuario. No se requiere sincronización.',
    sincronizados: 0,
  };
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