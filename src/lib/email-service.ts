// src/lib/email-service.ts
// Servicio centralizado para envío de emails

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ==================== TIPOS ====================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ==================== CONFIGURACIÓN ====================

const EMAIL_CONFIG = {
  // Configuración SMTP (puedes usar Gmail, SendGrid, Azure, etc.)
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },

  // Email remitente por defecto
  from: process.env.EMAIL_FROM || 'noreply@lacantera.com',
  fromName: process.env.EMAIL_FROM_NAME || 'La Cantera',
};

// ==================== SERVICIO DE EMAIL ====================

export class EmailService {
  private transporter: Transporter | null = null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Inicializa el transportador de email
   */
  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // En modo desarrollo, usar transportador de prueba (ethereal)
    if (this.isDevelopment) {
      console.log('📧 Modo desarrollo: Usando transportador de prueba');

      // Crear cuenta de prueba en ethereal.email
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('📧 Cuenta de prueba creada:', testAccount.user);
      return this.transporter;
    }

    // En producción, usar configuración real
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      throw new Error('Configuración de email incompleta. Verifica SMTP_USER y SMTP_PASSWORD en .env');
    }

    this.transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: EMAIL_CONFIG.auth,
    });

    // Verificar conexión
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email conectado correctamente');
    } catch (error: any) {
      console.error('❌ Error conectando servidor de email:', error);
      throw new Error(`Error al conectar con servidor de email: ${error.message}`);
    }

    return this.transporter;
  }

  /**
   * Envía un email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      console.log(`📧 Enviando email a: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      console.log(`   Asunto: ${options.subject}`);

      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        attachments: options.attachments,
      };

      const info = await transporter.sendMail(mailOptions);

      // En modo desarrollo, mostrar URL de vista previa
      if (this.isDevelopment) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('📧 Email enviado (modo desarrollo)');
        console.log('   Preview URL:', previewUrl);
      } else {
        console.log('✅ Email enviado exitosamente');
        console.log('   Message ID:', info.messageId);
      }

      return {
        success: true,
        messageId: info.messageId,
      };

    } catch (error: any) {
      console.error('❌ Error enviando email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remueve tags HTML de un string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Cierra la conexión del transportador
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      console.log('📧 Conexión de email cerrada');
    }
  }
}

// ==================== SINGLETON ====================

let emailServiceInstance: EmailService | null = null;

/**
 * Obtiene la instancia del servicio de email
 */
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

/**
 * Función helper para enviar emails
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const service = getEmailService();
  return await service.send(options);
}

// ==================== EXPORTAR ====================

export default {
  EmailService,
  getEmailService,
  sendEmail,
};
