// src/lib/services/email-notification-service.ts
// Servicio centralizado de notificaciones por email para todos los módulos

import { sendEmail } from '@/lib/email-service';
import { getEmailTemplate } from '@/lib/email-templates';
import {
  getWelcomeEmail,
  getInvitationEmail,
  getApprovalEmail,
  getRejectionEmail,
} from '@/lib/email-templates/proveedor';
import {
  getCambioPasswordEmail,
  getRecuperarPasswordEmail,
  getNotificacionSistemaEmail,
  getMensajeNuevoEmail,
} from '@/lib/email-templates/notificacion';

// ==================== TIPOS ====================

export interface NotificacionEmail {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}

export interface NotificacionOrdenCompra extends NotificacionEmail {
  tipo: 'nueva_oc' | 'oc_confirmada' | 'oc_cancelada' | 'oc_modificada';
  proveedor: {
    nombre: string;
    email: string;
  };
  orden: {
    id: number;
    movID: string;
    total: number;
    moneda: string;
    fechaEmision: Date;
    fechaRequerida?: Date;
    empresa: string;
  };
  url?: string;
}

export interface NotificacionFactura extends NotificacionEmail {
  tipo: 'factura_recibida' | 'factura_aprobada' | 'factura_rechazada' | 'factura_pagada';
  proveedor: {
    nombre: string;
    email: string;
  };
  factura: {
    id: number;
    folio: string;
    total: number;
    moneda: string;
    fechaEmision: Date;
    empresa: string;
    motivoRechazo?: string;
  };
  url?: string;
}

export interface NotificacionPago extends NotificacionEmail {
  tipo: 'pago_programado' | 'pago_realizado' | 'complemento_disponible';
  proveedor: {
    nombre: string;
    email: string;
  };
  pago: {
    id: number;
    monto: number;
    moneda: string;
    fechaPago: Date;
    facturas: string[];
    empresa: string;
  };
  url?: string;
}

// ==================== CLASE PRINCIPAL ====================

export class EmailNotificationService {
  private baseUrl: string;
  private adminEmails: string[];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.adminEmails = (process.env.ADMIN_NOTIFICATION_EMAILS || '').split(',').filter(Boolean);
  }

  // =================================================================
  // NOTIFICACIONES DE ÓRDENES DE COMPRA
  // =================================================================

  /**
   * Envía notificación cuando hay una nueva orden de compra para el proveedor
   */
  async notificarNuevaOrdenCompra(data: NotificacionOrdenCompra): Promise<boolean> {
    try {
      const { proveedor, orden, url } = data;

      const ordenUrl = url || `${this.baseUrl}/proveedores/ordenes-de-compra/${orden.id}`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'info',
        titulo: 'Nueva Orden de Compra',
        mensaje: `Tienes una nueva orden de compra ${orden.movID} por ${this.formatCurrency(orden.total, orden.moneda)} de ${orden.empresa}. Fecha requerida: ${orden.fechaRequerida ? this.formatDate(orden.fechaRequerida) : 'No especificada'}.`,
        accionTexto: 'Ver Orden',
        accionUrl: ordenUrl,
        fecha: new Date()
      });

      const result = await sendEmail({
        to: proveedor.email,
        subject: `Nueva Orden de Compra ${orden.movID} - ${orden.empresa}`,
        html
      });

      console.log(`📧 [EMAIL] Nueva OC ${orden.movID} notificada a ${proveedor.email}`);
      return result.success;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando nueva OC:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación cuando el proveedor confirma una orden
   */
  async notificarOrdenConfirmada(data: NotificacionOrdenCompra): Promise<boolean> {
    try {
      const { proveedor, orden, url } = data;

      // Notificar al admin
      if (this.adminEmails.length > 0) {
        const html = getNotificacionSistemaEmail({
          nombreUsuario: 'Administrador',
          tipo: 'success',
          titulo: 'Orden de Compra Confirmada',
          mensaje: `El proveedor ${proveedor.nombre} ha confirmado la orden ${orden.movID} por ${this.formatCurrency(orden.total, orden.moneda)}.`,
          accionTexto: 'Ver Orden',
          accionUrl: url || `${this.baseUrl}/ordenes-de-compra/${orden.id}`,
          fecha: new Date()
        });

        await sendEmail({
          to: this.adminEmails,
          subject: `OC ${orden.movID} Confirmada por ${proveedor.nombre}`,
          html
        });
      }

      console.log(`📧 [EMAIL] OC ${orden.movID} confirmada - admin notificado`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando OC confirmada:', error.message);
      return false;
    }
  }

  // =================================================================
  // NOTIFICACIONES DE FACTURAS
  // =================================================================

  /**
   * Envía notificación cuando se recibe una nueva factura (al admin)
   */
  async notificarFacturaRecibida(data: NotificacionFactura): Promise<boolean> {
    try {
      const { proveedor, factura, url } = data;

      if (this.adminEmails.length === 0) {
        console.log('⚠️ [EMAIL] No hay emails de admin configurados');
        return true;
      }

      const html = getNotificacionSistemaEmail({
        nombreUsuario: 'Administrador',
        tipo: 'info',
        titulo: 'Nueva Factura Recibida',
        mensaje: `El proveedor ${proveedor.nombre} ha subido la factura ${factura.folio} por ${this.formatCurrency(factura.total, factura.moneda)}. Requiere revision.`,
        accionTexto: 'Revisar Factura',
        accionUrl: url || `${this.baseUrl}/facturas/${factura.id}`,
        fecha: new Date()
      });

      await sendEmail({
        to: this.adminEmails,
        subject: `Nueva Factura ${factura.folio} de ${proveedor.nombre}`,
        html
      });

      console.log(`📧 [EMAIL] Factura ${factura.folio} - admin notificado`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando factura recibida:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación cuando una factura es aprobada (al proveedor)
   */
  async notificarFacturaAprobada(data: NotificacionFactura): Promise<boolean> {
    try {
      const { proveedor, factura, url } = data;

      const facturaUrl = url || `${this.baseUrl}/proveedores/facturacion`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'success',
        titulo: 'Factura Aprobada',
        mensaje: `Tu factura ${factura.folio} por ${this.formatCurrency(factura.total, factura.moneda)} ha sido aprobada y esta en proceso de pago.`,
        accionTexto: 'Ver Factura',
        accionUrl: facturaUrl,
        fecha: new Date()
      });

      await sendEmail({
        to: proveedor.email,
        subject: `Factura ${factura.folio} Aprobada - ${factura.empresa}`,
        html
      });

      console.log(`📧 [EMAIL] Factura ${factura.folio} aprobada - proveedor notificado`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando factura aprobada:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación cuando una factura es rechazada (al proveedor)
   */
  async notificarFacturaRechazada(data: NotificacionFactura): Promise<boolean> {
    try {
      const { proveedor, factura, url } = data;

      const facturaUrl = url || `${this.baseUrl}/proveedores/facturacion`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'danger',
        titulo: 'Factura Rechazada',
        mensaje: `Tu factura ${factura.folio} ha sido rechazada. Motivo: ${factura.motivoRechazo || 'No especificado'}. Por favor revisa y vuelve a enviarla.`,
        accionTexto: 'Ver Detalle',
        accionUrl: facturaUrl,
        fecha: new Date()
      });

      await sendEmail({
        to: proveedor.email,
        subject: `Factura ${factura.folio} Rechazada - Accion Requerida`,
        html
      });

      console.log(`📧 [EMAIL] Factura ${factura.folio} rechazada - proveedor notificado`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando factura rechazada:', error.message);
      return false;
    }
  }

  // =================================================================
  // NOTIFICACIONES DE PAGOS
  // =================================================================

  /**
   * Envía notificación cuando se programa un pago (al proveedor)
   */
  async notificarPagoProgramado(data: NotificacionPago): Promise<boolean> {
    try {
      const { proveedor, pago, url } = data;

      const pagoUrl = url || `${this.baseUrl}/proveedores/pagos`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'info',
        titulo: 'Pago Programado',
        mensaje: `Se ha programado un pago por ${this.formatCurrency(pago.monto, pago.moneda)} para el ${this.formatDate(pago.fechaPago)}. Facturas incluidas: ${pago.facturas.join(', ')}.`,
        accionTexto: 'Ver Pagos',
        accionUrl: pagoUrl,
        fecha: new Date()
      });

      await sendEmail({
        to: proveedor.email,
        subject: `Pago Programado - ${this.formatCurrency(pago.monto, pago.moneda)} - ${pago.empresa}`,
        html
      });

      console.log(`📧 [EMAIL] Pago programado notificado a ${proveedor.email}`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando pago programado:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación cuando se realiza un pago (al proveedor)
   */
  async notificarPagoRealizado(data: NotificacionPago): Promise<boolean> {
    try {
      const { proveedor, pago, url } = data;

      const pagoUrl = url || `${this.baseUrl}/proveedores/pagos`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'success',
        titulo: 'Pago Realizado',
        mensaje: `Se ha realizado el pago por ${this.formatCurrency(pago.monto, pago.moneda)}. Facturas pagadas: ${pago.facturas.join(', ')}. El complemento de pago estara disponible pronto.`,
        accionTexto: 'Ver Comprobante',
        accionUrl: pagoUrl,
        fecha: new Date()
      });

      await sendEmail({
        to: proveedor.email,
        subject: `Pago Realizado - ${this.formatCurrency(pago.monto, pago.moneda)} - ${pago.empresa}`,
        html
      });

      console.log(`📧 [EMAIL] Pago realizado notificado a ${proveedor.email}`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando pago realizado:', error.message);
      return false;
    }
  }

  /**
   * Envía notificación cuando hay un complemento de pago disponible
   */
  async notificarComplementoDisponible(data: NotificacionPago): Promise<boolean> {
    try {
      const { proveedor, pago, url } = data;

      const pagoUrl = url || `${this.baseUrl}/proveedores/pagos`;

      const html = getNotificacionSistemaEmail({
        nombreUsuario: proveedor.nombre,
        tipo: 'success',
        titulo: 'Complemento de Pago Disponible',
        mensaje: `El complemento de pago por ${this.formatCurrency(pago.monto, pago.moneda)} ya esta disponible para descarga.`,
        accionTexto: 'Descargar Complemento',
        accionUrl: pagoUrl,
        fecha: new Date()
      });

      await sendEmail({
        to: proveedor.email,
        subject: `Complemento de Pago Disponible - ${pago.empresa}`,
        html
      });

      console.log(`📧 [EMAIL] Complemento disponible notificado a ${proveedor.email}`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando complemento:', error.message);
      return false;
    }
  }

  // =================================================================
  // NOTIFICACIONES GENERALES
  // =================================================================

  /**
   * Envía notificación de nuevo mensaje
   */
  async notificarNuevoMensaje(data: {
    to: string;
    destinatarioNombre: string;
    remitenteNombre: string;
    empresaOrigen: string;
    asunto: string;
    mensaje: string;
    conversacionId: string;
  }): Promise<boolean> {
    try {
      const mensajeUrl = `${this.baseUrl}/mensajes?conversacion=${data.conversacionId}`;

      const html = getMensajeNuevoEmail({
        nombreDestinatario: data.destinatarioNombre,
        nombreRemitente: data.remitenteNombre,
        empresaOrigen: data.empresaOrigen,
        asunto: data.asunto,
        mensaje: data.mensaje.substring(0, 500) + (data.mensaje.length > 500 ? '...' : ''),
        fechaEnvio: new Date(),
        mensajesUrl: mensajeUrl
      });

      await sendEmail({
        to: data.to,
        subject: `Nuevo mensaje de ${data.remitenteNombre}: ${data.asunto}`,
        html
      });

      console.log(`📧 [EMAIL] Nuevo mensaje notificado a ${data.to}`);
      return true;

    } catch (error: any) {
      console.error('❌ [EMAIL] Error notificando mensaje:', error.message);
      return false;
    }
  }

  // =================================================================
  // HELPERS
  // =================================================================

  private formatCurrency(amount: number, currency: string = 'MXN'): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
}

// ==================== SINGLETON ====================

let instance: EmailNotificationService | null = null;

export function getEmailNotificationService(): EmailNotificationService {
  if (!instance) {
    instance = new EmailNotificationService();
  }
  return instance;
}

export const emailNotificationService = getEmailNotificationService();
