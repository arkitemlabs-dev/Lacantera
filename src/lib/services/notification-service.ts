// src/lib/services/notification-service.ts
import { database } from '@/lib/database';

export interface NotificationData {
  usuarioId: string | number;
  usuarioNombre?: string;
  empresaId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link?: string;
  datos?: Record<string, any>;
  prioridad?: 'normal' | 'alta' | 'critica';
}

export class NotificationService {
  /**
   * Envía una notificación completa (BD + SSE + Email si aplica)
   */
  static async enviarNotificacion(data: NotificationData): Promise<string> {
    try {
      // 1. Crear notificación en WebNotificacion (sin FK constraints)
      const notificacionId = await database.createNotificacion({
        usuarioId: String(data.usuarioId),
        usuarioNombre: data.usuarioNombre || '',
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        link: data.link,
        datosJSON: data.datos ? JSON.stringify(data.datos) : undefined,
        leida: false,
        emailEnviado: false,
        prioridad: data.prioridad || 'normal',
        empresaId: data.empresaId
      });

      // 2. Enviar notificación SSE en tiempo real
      try {
        const { sendNotificationToUser } = await import('@/app/api/notificaciones/sse/route');

        const notificationPayload = {
          id: notificacionId,
          notificacionID: notificacionId,
          notificacionId: notificacionId,
          usuario: String(data.usuarioId),
          usuarioId: String(data.usuarioId),
          usuarioNombre: data.usuarioNombre || '',
          empresa: data.empresaId,
          empresaId: data.empresaId,
          titulo: data.titulo,
          mensaje: data.mensaje,
          tipo: data.tipo,
          link: data.link,
          datosJSON: data.datos ? JSON.stringify(data.datos) : null,
          leida: false,
          emailEnviado: false,
          prioridad: data.prioridad || 'normal',
          createdAt: new Date().toISOString(),
        };

        sendNotificationToUser(data.usuarioId, data.empresaId, notificationPayload);
        console.log(`Notificación SSE enviada a usuario ${data.usuarioId}`);
      } catch (sseError) {
        console.log('SSE no disponible, notificación guardada en BD:', sseError);
      }

      // 3. Programar envío de email si es necesario
      if (this.shouldSendEmail(data.tipo)) {
        await this.programarEnvioEmail(data);
      }

      console.log(`Notificación creada: ${data.titulo} para usuario ${data.usuarioId}`);
      return notificacionId;

    } catch (error) {
      console.error('Error enviando notificación:', error);
      throw error;
    }
  }

  /**
   * Envía notificación de nuevo mensaje
   */
  static async enviarNotificacionMensaje(data: {
    destinatarioId: string | number;
    remitenteNombre: string;
    asunto: string;
    empresaId: string;
    conversacionId: string;
  }): Promise<string> {
    return this.enviarNotificacion({
      usuarioId: data.destinatarioId,
      empresaId: data.empresaId,
      tipo: 'nuevo_mensaje',
      titulo: 'Nuevo mensaje',
      mensaje: `${data.remitenteNombre}: ${data.asunto}`,
      link: `/mensajeria?conversacion=${data.conversacionId}`,
      datos: {
        conversacionId: data.conversacionId,
        remitente: data.remitenteNombre
      },
      prioridad: 'normal'
    });
  }

  /**
   * Envía notificación de orden de compra
   */
  static async enviarNotificacionOrdenCompra(data: {
    proveedorId: string | number;
    ordenId: string;
    monto: number;
    empresaId: string;
    tipo: 'nueva' | 'aceptada' | 'rechazada' | 'completada';
  }): Promise<string> {
    const mensajes = {
      nueva: `Nueva orden de compra ${data.ordenId} por $${data.monto.toLocaleString()}`,
      aceptada: `Orden de compra ${data.ordenId} aceptada`,
      rechazada: `Orden de compra ${data.ordenId} rechazada`,
      completada: `Orden de compra ${data.ordenId} completada`
    };

    return this.enviarNotificacion({
      usuarioId: data.proveedorId,
      empresaId: data.empresaId,
      tipo: 'nueva_oc',
      titulo: 'Orden de Compra',
      mensaje: mensajes[data.tipo],
      link: `/proveedores/ordenes-de-compra/${data.ordenId}`,
      datos: {
        ordenId: data.ordenId,
        monto: data.monto,
        accion: data.tipo
      },
      prioridad: 'alta'
    });
  }

  /**
   * Envía notificación de factura
   */
  static async enviarNotificacionFactura(data: {
    proveedorId: string | number;
    facturaId: string;
    folio: string;
    empresaId: string;
    tipo: 'aprobada' | 'rechazada' | 'en_revision';
    motivo?: string;
  }): Promise<string> {
    const mensajes = {
      aprobada: `Factura ${data.folio} aprobada`,
      rechazada: `Factura ${data.folio} rechazada${data.motivo ? `: ${data.motivo}` : ''}`,
      en_revision: `Factura ${data.folio} en revisión`
    };

    return this.enviarNotificacion({
      usuarioId: data.proveedorId,
      empresaId: data.empresaId,
      tipo: 'factura_' + data.tipo,
      titulo: 'Factura',
      mensaje: mensajes[data.tipo],
      link: `/proveedores/facturacion`,
      datos: {
        facturaId: data.facturaId,
        folio: data.folio,
        accion: data.tipo,
        motivo: data.motivo
      },
      prioridad: data.tipo === 'rechazada' ? 'alta' : 'normal'
    });
  }

  /**
   * Determina si se debe enviar email para un tipo de notificación
   */
  private static shouldSendEmail(tipo: string): boolean {
    const tiposConEmail = [
      'nueva_oc',
      'factura_aprobada',
      'factura_rechazada',
      'pago_recibido',
      'documento_rechazado'
    ];
    return tiposConEmail.includes(tipo);
  }

  /**
   * Programa el envío de email (placeholder)
   */
  private static async programarEnvioEmail(data: NotificationData): Promise<void> {
    // TODO: Implementar integración con servicio de email
    console.log(`Email programado para usuario ${data.usuarioId}: ${data.titulo}`);
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  static async getContadorNoLeidas(usuarioId: string | number, empresaId: string): Promise<number> {
    try {
      return await database.getNotificacionesNoLeidas(String(usuarioId));
    } catch (error) {
      console.error('Error obteniendo contador de notificaciones:', error);
      return 0;
    }
  }

  /**
   * Marca una notificación como leída
   */
  static async marcarComoLeida(notificacionId: string, usuarioId: string | number, empresaId: string): Promise<void> {
    try {
      await database.marcarNotificacionComoLeida(notificacionId);

      // Actualizar contador SSE
      try {
        const { sendNotificationCountUpdate } = await import('@/app/api/notificaciones/sse/route');
        const nuevoContador = await this.getContadorNoLeidas(usuarioId, empresaId);
        sendNotificationCountUpdate(usuarioId, empresaId, nuevoContador);
      } catch (sseError) {
        console.log('SSE no disponible para actualizar contador');
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      throw error;
    }
  }
}