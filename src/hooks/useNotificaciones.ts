import { useState, useEffect, useCallback } from 'react';
import { NotificacionPortal } from '@/lib/types';

export function useNotificaciones(empresa: string, autoRefresh = true) {
  const [notificaciones, setNotificaciones] = useState<NotificacionPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noLeidasCount, setNoLeidasCount] = useState(0);

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
      const count = data.notificaciones.filter((n: NotificacionPortal) => !n.leida).length;
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

  const crearNotificacion = useCallback(async (notificacion: Partial<NotificacionPortal>) => {
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

  // Cargar notificaciones al montar
  useEffect(() => {
    fetchNotificaciones();
  }, [fetchNotificaciones]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotificaciones();
    }, 30000); // 30 segundos

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
