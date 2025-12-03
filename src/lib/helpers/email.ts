// src/lib/helpers/email.ts
// Helper para envío de emails usando Nodemailer

import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/lib/email-templates';

// ==================== TIPOS ====================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  templateType: string;
  templateData: any;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

// ==================== CONFIGURACIÓN ====================

/**
 * Obtiene o crea el transporter de nodemailer
 */
function getTransporter() {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Configuración adicional para Gmail
    ...(process.env.SMTP_HOST === 'smtp.gmail.com' && {
      service: 'gmail',
    }),
  });
}

// ==================== FUNCIONES ====================

/**
 * Envía un email usando un template
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Validar configuración SMTP
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('Configuración SMTP incompleta');
      return false;
    }

    // Generar HTML del template
    const html = getEmailTemplate(options.templateType, options.templateData);

    if (!html) {
      console.error(`No se pudo generar template: ${options.templateType}`);
      return false;
    }

    // Preparar opciones de correo
    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'Portal de Proveedores',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
      },
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html,
      ...(options.cc && {
        cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc,
      }),
      ...(options.bcc && {
        bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
      }),
      ...(options.attachments && { attachments: options.attachments }),
    };

    // Enviar email
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log('Email enviado:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
}

/**
 * Verifica la conexión con el servidor SMTP
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('Conexión SMTP verificada correctamente');
    return true;
  } catch (error) {
    console.error('Error al verificar conexión SMTP:', error);
    return false;
  }
}

/**
 * Envía email de documento aprobado
 */
export async function sendDocumentoAprobadoEmail(data: {
  to: string;
  proveedorNombre: string;
  nombreDocumento: string;
  tipoDocumento: string;
  fechaAprobacion: string;
  comentarios?: string;
}) {
  return sendEmail({
    to: data.to,
    subject: '✓ Documento Aprobado - Portal de Proveedores',
    templateType: 'documento:aprobado',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  });
}

/**
 * Envía email de documento rechazado
 */
export async function sendDocumentoRechazadoEmail(data: {
  to: string;
  proveedorNombre: string;
  nombreDocumento: string;
  tipoDocumento: string;
  fechaRechazo: string;
  motivoRechazo: string;
}) {
  return sendEmail({
    to: data.to,
    subject: '✗ Documento Rechazado - Acción Requerida',
    templateType: 'documento:rechazado',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proveedores/documentos`,
    },
  });
}

/**
 * Envía email de documentos vencidos
 */
export async function sendDocumentoVencidoEmail(data: {
  to: string;
  proveedorNombre: string;
  documentosVencidos: Array<{
    nombreDocumento: string;
    tipoDocumento: string;
    fechaVencimiento: string;
  }>;
}) {
  return sendEmail({
    to: data.to,
    subject: '⚠️ URGENTE: Documentos Vencidos - Actualización Requerida',
    templateType: 'documento:vencido',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proveedores/documentos`,
    },
  });
}

/**
 * Envía email de documentos próximos a vencer
 */
export async function sendDocumentoProximoVencerEmail(data: {
  to: string;
  proveedorNombre: string;
  documentosProximos: Array<{
    nombreDocumento: string;
    tipoDocumento: string;
    fechaVencimiento: string;
    diasRestantes: number;
  }>;
}) {
  return sendEmail({
    to: data.to,
    subject: '🔔 Recordatorio: Documentos Próximos a Vencer',
    templateType: 'documento:proximoVencer',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proveedores/documentos`,
    },
  });
}

/**
 * Envía email solicitando documentos
 */
export async function sendDocumentoSolicitadoEmail(data: {
  to: string;
  proveedorNombre: string;
  tiposDocumento: string[];
  empresaNombre: string;
  fechaLimite?: string;
}) {
  return sendEmail({
    to: data.to,
    subject: '📄 Documentos Solicitados - Portal de Proveedores',
    templateType: 'documento:solicitado',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proveedores/documentos`,
    },
  });
}

/**
 * Envía email de nuevo mensaje
 */
export async function sendNuevoMensajeEmail(data: {
  to: string;
  destinatarioNombre: string;
  remitenteNombre: string;
  asunto: string;
  mensaje: string;
  conversacionID: string;
}) {
  return sendEmail({
    to: data.to,
    subject: `💬 Nuevo mensaje: ${data.asunto}`,
    templateType: 'notificacion:mensaje',
    templateData: {
      ...data,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/mensajes?conversacion=${data.conversacionID}`,
    },
  });
}
