// src/hooks/useMensajeria.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Conversacion, Mensaje } from '@/types/backend';
import { 
  getConversacionesByUsuario, 
  getMensajesByConversacion,
  enviarMensaje,
  marcarMensajesComoLeidos,
  crearConversacion,
  getMensajesNoLeidos
} from '@/app/actions/mensajes';

interface UseMensajeriaReturn {
  conversaciones: Conversacion[];
  conversacionActiva: Conversacion | null;
  mensajes: Mensaje[];
  cargando: boolean;
  enviando: boolean;
  error: string | null;
  mensajesNoLeidos: number;
  
  // Funciones
  cargarConversaciones: () => Promise<void>;
  seleccionarConversacion: (conversacionId: string) => Promise<void>;
  enviarNuevoMensaje: (mensaje: string, archivos?: File[]) => Promise<boolean>;
  crearNuevaConversacion: (data: {
    destinatarioId: string;
    destinatarioNombre: string;
    asunto: string;
    mensaje: string;
    archivos?: File[];
  }) => Promise<string | null>;
  marcarComoLeido: () => Promise<void>;
  actualizarMensajesNoLeidos: () => Promise<void>;
}

export function useMensajeria(
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
  empresaId: string
): UseMensajeriaReturn {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  
  // Referencias para intervalos
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificacionesIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar conversaciones del usuario
  const cargarConversaciones = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      
      const response = await getConversacionesByUsuario(usuarioId);
      
      if (response.success) {
        setConversaciones(response.data);
      } else {
        setError(response.error || 'Error cargando conversaciones');
      }
    } catch (error) {
      setError('Error inesperado cargando conversaciones');
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  // Seleccionar conversación y cargar mensajes
  const seleccionarConversacion = useCallback(async (conversacionId: string) => {
    try {
      setCargando(true);
      setError(null);

      // Encontrar conversación en el estado
      const conversacion = conversaciones.find(c => c.id === conversacionId);
      if (conversacion) {
        setConversacionActiva(conversacion);
      }

      // Cargar mensajes
      const mensajesResponse = await getMensajesByConversacion(conversacionId, usuarioId);
      
      if (mensajesResponse.success) {
        setMensajes(mensajesResponse.data);
        
        // Marcar mensajes como leídos
        await marcarMensajesComoLeidos(conversacionId, usuarioId);
        
        // Actualizar contador de no leídos en la conversación
        setConversaciones(prev => 
          prev.map(c => 
            c.id === conversacionId 
              ? { ...c, noLeidos: { ...c.noLeidos, [usuarioId]: 0 } }
              : c
          )
        );
      } else {
        setError(mensajesResponse.error || 'Error cargando mensajes');
      }
    } catch (error) {
      setError('Error inesperado cargando mensajes');
      console.error('Error:', error);
    } finally {
      setCargando(false);
    }
  }, [conversaciones, usuarioId]);

  // Enviar nuevo mensaje
  const enviarNuevoMensaje = useCallback(async (
    mensaje: string, 
    archivos?: File[]
  ): Promise<boolean> => {
    if (!conversacionActiva) return false;

    try {
      setEnviando(true);
      setError(null);

      const response = await enviarMensaje({
        conversacionId: conversacionActiva.id,
        remitenteId: usuarioId,
        remitenteNombre: usuarioNombre,
        remitenteRol: usuarioRol,
        mensaje,
        archivos
      });

      if (response.success) {
        // Agregar mensaje al estado local
        setMensajes(prev => [...prev, response.data]);
        
        // Actualizar última mensaje en conversación
        setConversaciones(prev =>
          prev.map(c =>
            c.id === conversacionActiva.id
              ? {
                  ...c,
                  ultimoMensaje: mensaje,
                  ultimoMensajeFecha: new Date(),
                  ultimoMensajeRemitente: usuarioNombre
                }
              : c
          )
        );

        return true;
      } else {
        setError(response.error || 'Error enviando mensaje');
        return false;
      }
    } catch (error) {
      setError('Error inesperado enviando mensaje');
      console.error('Error:', error);
      return false;
    } finally {
      setEnviando(false);
    }
  }, [conversacionActiva, usuarioId, usuarioNombre, usuarioRol]);

  // Crear nueva conversación
  const crearNuevaConversacion = useCallback(async (data: {
    destinatarioId: string;
    destinatarioNombre: string;
    asunto: string;
    mensaje: string;
    archivos?: File[];
  }): Promise<string | null> => {
    try {
      setEnviando(true);
      setError(null);

      const response = await crearConversacion({
        remitenteId: usuarioId,
        remitenteNombre: usuarioNombre,
        remitenteRol: usuarioRol,
        destinatarioId: data.destinatarioId,
        destinatarioNombre: data.destinatarioNombre,
        asunto: data.asunto,
        mensajeInicial: data.mensaje,
        archivos: data.archivos,
        empresaId
      });

      if (response.success) {
        // Agregar nueva conversación al estado
        setConversaciones(prev => [response.data.conversacion, ...prev]);
        
        return response.data.conversacionId;
      } else {
        setError(response.error || 'Error creando conversación');
        return null;
      }
    } catch (error) {
      setError('Error inesperado creando conversación');
      console.error('Error:', error);
      return null;
    } finally {
      setEnviando(false);
    }
  }, [usuarioId, usuarioNombre, usuarioRol, empresaId]);

  // Marcar conversación actual como leída
  const marcarComoLeido = useCallback(async () => {
    if (!conversacionActiva) return;

    try {
      await marcarMensajesComoLeidos(conversacionActiva.id, usuarioId);
      
      // Actualizar estado local
      setConversaciones(prev =>
        prev.map(c =>
          c.id === conversacionActiva.id
            ? { ...c, noLeidos: { ...c.noLeidos, [usuarioId]: 0 } }
            : c
        )
      );
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }
  }, [conversacionActiva, usuarioId]);

  // Actualizar contador de mensajes no leídos
  const actualizarMensajesNoLeidos = useCallback(async () => {
    try {
      const response = await getMensajesNoLeidos(usuarioId);
      if (response.success) {
        setMensajesNoLeidos(response.data.count);
      }
    } catch (error) {
      console.error('Error actualizando mensajes no leídos:', error);
    }
  }, [usuarioId]);

  // Polling para nuevos mensajes y actualizaciones en tiempo real
  const iniciarPolling = useCallback(() => {
    // Actualizar conversaciones cada 30 segundos
    intervalRef.current = setInterval(() => {
      cargarConversaciones();
      
      // Si hay conversación activa, recargar mensajes
      if (conversacionActiva) {
        getMensajesByConversacion(conversacionActiva.id, usuarioId).then(response => {
          if (response.success) {
            setMensajes(response.data);
          }
        });
      }
    }, 30000);

    // Actualizar contador de mensajes no leídos cada 10 segundos
    notificacionesIntervalRef.current = setInterval(() => {
      actualizarMensajesNoLeidos();
    }, 10000);
  }, [cargarConversaciones, conversacionActiva, usuarioId, actualizarMensajesNoLeidos]);

  const detenerPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (notificacionesIntervalRef.current) {
      clearInterval(notificacionesIntervalRef.current);
      notificacionesIntervalRef.current = null;
    }
  }, []);

  // Effects
  useEffect(() => {
    cargarConversaciones();
    actualizarMensajesNoLeidos();
  }, [cargarConversaciones, actualizarMensajesNoLeidos]);

  useEffect(() => {
    iniciarPolling();
    
    // Cleanup al desmontar
    return () => {
      detenerPolling();
    };
  }, [iniciarPolling, detenerPolling]);

  // Limpiar intervalos al cambiar de usuario
  useEffect(() => {
    return () => {
      detenerPolling();
    };
  }, [usuarioId, detenerPolling]);

  return {
    conversaciones,
    conversacionActiva,
    mensajes,
    cargando,
    enviando,
    error,
    mensajesNoLeidos,
    
    cargarConversaciones,
    seleccionarConversacion,
    enviarNuevoMensaje,
    crearNuevaConversacion,
    marcarComoLeido,
    actualizarMensajesNoLeidos
  };
}

// Hook para notificaciones
export function useNotificaciones(usuarioId: string) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setCargando(true);
      
      // Importar la función de notificaciones
      const { getNotificacionesByUsuario, getNotificacionesNoLeidas } = 
        await import('@/app/actions/notificaciones');
      
      const [notifResponse, noLeidasResponse] = await Promise.all([
        getNotificacionesByUsuario(usuarioId, { limit: 20 }),
        getNotificacionesNoLeidas(usuarioId)
      ]);

      if (notifResponse.success) {
        setNotificaciones(notifResponse.data);
      }

      if (noLeidasResponse.success) {
        setNoLeidas(noLeidasResponse.data.count);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  const marcarComoLeida = useCallback(async (notificacionId: string) => {
    try {
      const { marcarNotificacionComoLeida } = await import('@/app/actions/notificaciones');
      
      const response = await marcarNotificacionComoLeida(notificacionId, usuarioId);
      
      if (response.success) {
        setNotificaciones(prev =>
          prev.map(n => n.id === notificacionId ? { ...n, leida: true } : n)
        );
        setNoLeidas(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  }, [usuarioId]);

  const marcarTodasComoLeidas = useCallback(async () => {
    try {
      const { marcarTodasNotificacionesComoLeidas } = await import('@/app/actions/notificaciones');
      
      const response = await marcarTodasNotificacionesComoLeidas(usuarioId);
      
      if (response.success) {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
        setNoLeidas(0);
      }
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  }, [usuarioId]);

  useEffect(() => {
    cargarNotificaciones();
    
    // Polling cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  return {
    notificaciones,
    noLeidas,
    cargando,
    cargarNotificaciones,
    marcarComoLeida,
    marcarTodasComoLeidas
  };
}