import { NextRequest } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { extendedDb } from '@/lib/database/sqlserver-extended';

// Mapa para mantener las conexiones SSE activas
const connections = new Map<string, ReadableStreamDefaultController>();

export const GET = withTenantContext(async (request, { tenant, user }) => {
  const userId = parseInt(user.id);
  const empresaCode = tenant.empresaCodigo;
  const connectionId = `${userId}-${empresaCode}`;

  // Crear stream para Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Guardar la conexión
      connections.set(connectionId, controller);

      // Enviar evento inicial
      controller.enqueue(`data: ${JSON.stringify({ 
        type: 'connected', 
        userId, 
        empresa: empresaCode 
      })}\n\n`);

      // Enviar notificaciones no leídas iniciales
      extendedDb.getNotificacionesUsuario(userId, empresaCode, 10)
        .then(notificaciones => {
          const noLeidas = notificaciones.filter(n => !n.leida);
          if (noLeidas.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'initial_notifications',
              count: noLeidas.length,
              notifications: noLeidas
            })}\n\n`);
          }
        })
        .catch(console.error);
    },
    cancel() {
      // Limpiar conexión cuando se cierra
      connections.delete(connectionId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
});

// Función para enviar notificación a un usuario específico
export function sendNotificationToUser(userId: number, empresa: string, notification: any) {
  const connectionId = `${userId}-${empresa}`;
  const controller = connections.get(connectionId);
  
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'new_notification',
        notification
      })}\n\n`);
    } catch (error) {
      console.error('Error enviando notificación SSE:', error);
      // Limpiar conexión si hay error
      connections.delete(connectionId);
    }
  }
}

// Función para enviar actualización de contador
export function sendNotificationCountUpdate(userId: number, empresa: string, count: number) {
  const connectionId = `${userId}-${empresa}`;
  const controller = connections.get(connectionId);
  
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'count_update',
        count
      })}\n\n`);
    } catch (error) {
      console.error('Error enviando actualización de contador SSE:', error);
      connections.delete(connectionId);
    }
  }
}