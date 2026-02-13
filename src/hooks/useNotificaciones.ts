import { useState, useEffect, useCallback, useRef } from 'react';

export function useNotificaciones(empresa: string, autoRefresh = true) {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noLeidasCount, setNoLeidasCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotificaciones = useCallback(async (soloNoLeidas = false) => {
    try {
      setLoading(true);
      const url = `/api/notificaciones?empresa=${empresa}${soloNoLeidas ? '&noLeidas=true' : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al cargar notificaciones');
      }

      const data = await response.json();
      setNotificaciones(data.notificaciones);

      // Contar no leídas
      const count = data.notificaciones.filter((n: any) => !n.leida).length;
      setNoLeidasCount(count);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [empresa]);

  const marcarComoLeida = useCallback(async (notificacionID: string) => {
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionID }),
      });

      if (!response.ok) {
        throw new Error('Error al marcar notificación');
      }

      // Actualizar estado local
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.notificacionID === notificacionID ? { ...n, leida: true } : n
        )
      );

      setNoLeidasCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar notificación:', err);
    }
  }, []);

  const crearNotificacion = useCallback(async (notificacion: Partial<any>) => {
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificacion),
      });

      if (!response.ok) {
        throw new Error('Error al crear notificación');
      }

      const data = await response.json();

      // Agregar al estado local
      setNotificaciones((prev) => [data.notificacion, ...prev]);
      setNoLeidasCount((prev) => prev + 1);

      return data.notificacion;
    } catch (err) {
      console.error('Error al crear notificación:', err);
      throw err;
    }
  }, []);

  // Configurar Server-Sent Events para notificaciones en tiempo real
  useEffect(() => {
    if (!empresa) return;

    // Cargar notificaciones iniciales
    fetchNotificaciones();

    // Configurar SSE
    const eventSource = new EventSource(`/api/notificaciones/sse?empresa=${empresa}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            console.log('🔔 Conectado a notificaciones en tiempo real');
            break;
            
          case 'initial_notifications':
            setNoLeidasCount(data.count);
            break;
            
          case 'new_notification':
            // Agregar nueva notificación al inicio
            setNotificaciones(prev => [data.notification, ...prev]);
            setNoLeidasCount(prev => prev + 1);
            
            // Mostrar notificación del navegador si está permitido
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(data.notification.titulo, {
                body: data.notification.mensaje,
                icon: '/favicon.ico'
              });
            }
            break;
            
          case 'count_update':
            setNoLeidasCount(data.count);
            break;
        }
      } catch (err) {
        console.error('Error procesando evento SSE:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Error en SSE:', error);
      setError('Error en conexión de notificaciones');
    };

    // Solicitar permisos de notificación del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [empresa, fetchNotificaciones]);

  // Fallback: Auto-refresh cada 60 segundos si SSE falla
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Solo hacer polling si SSE no está conectado
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        fetchNotificaciones();
      }
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, fetchNotificaciones]);

  return {
    notificaciones,
    loading,
    error,
    noLeidasCount,
    refetch: fetchNotificaciones,
    marcarComoLeida,
    crearNotificacion,
  };
}
