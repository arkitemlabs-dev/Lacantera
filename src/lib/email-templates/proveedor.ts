// src/lib/email-templates/proveedor.ts
// Templates de email para proveedores

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

// ==================== BIENVENIDA ====================

export interface WelcomeEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  email: string;
  empresaCliente: string;
  loginUrl: string;
}

export function getWelcomeEmail(data: WelcomeEmailData): string {
  const content = `
    <h1>¡Bienvenido a La Cantera! 🎉</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Nos complace informarte que <strong>${data.nombreProveedor}</strong> ha sido registrado exitosamente como proveedor de <strong>${data.empresaCliente}</strong>.</p>

    ${getAlert('Tu cuenta ha sido creada y ya puedes acceder al sistema.', 'success')}

    <h2>Tus credenciales de acceso</h2>
    ${getCard(`
      <p style="margin: 0;"><strong>Email:</strong> ${data.email}</p>
      <p style="margin: 10px 0 0 0;"><strong>Contraseña:</strong> La que estableciste durante el registro</p>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Iniciar Sesión', data.loginUrl)}
    </div>

    <h2>¿Qué puedes hacer en el sistema?</h2>
    <ul>
      <li><strong>Subir facturas</strong> - Carga tus facturas XML y PDF</li>
      <li><strong>Seguimiento en tiempo real</strong> - Consulta el estado de tus facturas</li>
      <li><strong>Recibir pagos</strong> - Revisa los complementos de pago</li>
      <li><strong>Comunicación directa</strong> - Mensajes con el equipo de compras</li>
      <li><strong>Reportes</strong> - Consulta tu historial de transacciones</li>
    </ul>

    ${getAlert('Si tienes alguna duda, no dudes en contactarnos. Estamos aquí para ayudarte.', 'info')}

    <p>¡Gracias por confiar en nosotros!</p>
    <p><strong>El equipo de La Cantera</strong></p>
  `;

  return getBaseTemplate(content, `Bienvenido a La Cantera - ${data.empresaCliente}`);
}

// ==================== INVITACIÓN ====================

export interface InvitationEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  mensajePersonalizado?: string;
  registroUrl: string;
}

export function getInvitationEmail(data: InvitationEmailData): string {
  const content = `
    <h1>Invitación a La Cantera</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p><strong>${data.empresaCliente}</strong> te invita a unirte a La Cantera, nuestro sistema de gestión de proveedores.</p>

    ${data.mensajePersonalizado ? getCard(`
      <p style="margin: 0; font-style: italic;">"${data.mensajePersonalizado}"</p>
    `) : ''}

    <h2>¿Qué es La Cantera?</h2>
    <p>La Cantera es una plataforma que facilita la gestión de facturas, pagos y comunicación entre proveedores y empresas. Con nuestro sistema podrás:</p>

    <ul>
      <li>✅ Subir facturas de forma rápida y segura</li>
      <li>📊 Consultar el estado de tus facturas en tiempo real</li>
      <li>💰 Recibir notificaciones de pagos</li>
      <li>💬 Comunicarte directamente con el equipo de compras</li>
      <li>📈 Acceder a reportes detallados</li>
    </ul>

    ${getAlert('El registro es completamente gratuito y solo te tomará unos minutos.', 'info')}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Registrarme Ahora', data.registroUrl)}
    </div>

    <p>Si tienes alguna pregunta sobre el proceso de registro, no dudes en contactarnos.</p>

    <p>¡Esperamos verte pronto!</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, `${data.empresaCliente} te invita a La Cantera`);
}

// ==================== SOLICITUD DE DOCUMENTOS ====================

export interface DocumentRequestEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  documentosSolicitados: string[];
  fechaLimite?: Date;
  motivo?: string;
  uploadUrl: string;
}

export function getDocumentRequestEmail(data: DocumentRequestEmailData): string {
  const content = `
    <h1>Solicitud de Documentos 📄</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p><strong>${data.empresaCliente}</strong> necesita que actualices algunos documentos en el sistema.</p>

    ${data.motivo ? getAlert(data.motivo, 'info') : ''}

    <h2>Documentos solicitados:</h2>
    <ul>
      ${data.documentosSolicitados.map(doc => `<li>${doc}</li>`).join('')}
    </ul>

    ${data.fechaLimite ? getAlert(`
      <strong>Fecha límite:</strong> ${data.fechaLimite.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    `, 'warning') : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Subir Documentos', data.uploadUrl)}
    </div>

    <p>Si tienes alguna duda sobre los documentos solicitados, por favor contacta al equipo de compras.</p>

    <p>Gracias por tu pronta atención.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Solicitud de documentos');
}

// ==================== APROBACIÓN DE PROVEEDOR ====================

export interface ApprovalEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  fechaAprobacion: Date;
  numeroProveedor?: string;
  dashboardUrl: string;
}

export function getApprovalEmail(data: ApprovalEmailData): string {
  const content = `
    <h1>¡Proveedor Aprobado! ✅</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('¡Excelentes noticias! Tu solicitud ha sido aprobada.', 'success')}

    <p>Nos complace informarte que <strong>${data.nombreProveedor}</strong> ha sido aprobado como proveedor oficial de <strong>${data.empresaCliente}</strong>.</p>

    ${data.numeroProveedor ? getCard(`
      <p style="margin: 0;"><strong>Número de Proveedor:</strong> ${data.numeroProveedor}</p>
      <p style="margin: 10px 0 0 0;"><strong>Fecha de Aprobación:</strong> ${data.fechaAprobacion.toLocaleDateString('es-MX')}</p>
    `) : ''}

    <h2>Próximos pasos:</h2>
    <ol>
      <li>Accede a tu panel de control</li>
      <li>Completa tu perfil con información adicional</li>
      <li>Revisa los términos y condiciones comerciales</li>
      <li>Comienza a subir tus facturas</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ir al Panel de Control', data.dashboardUrl)}
    </div>

    <p>Estamos emocionados de iniciar esta relación comercial contigo.</p>

    <p>¡Bienvenido al equipo!</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, '¡Tu solicitud ha sido aprobada!');
}

// ==================== RECHAZO DE PROVEEDOR ====================

export interface RejectionEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  motivo?: string;
  puedeReaplicar?: boolean;
  contactoEmail?: string;
}

export function getRejectionEmail(data: RejectionEmailData): string {
  const content = `
    <h1>Actualización de tu Solicitud</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Lamentamos informarte que después de revisar tu solicitud, en este momento no podemos aprobar a <strong>${data.nombreProveedor}</strong> como proveedor de <strong>${data.empresaCliente}</strong>.</p>

    ${data.motivo ? getAlert(`<strong>Motivo:</strong> ${data.motivo}`, 'warning') : ''}

    ${data.puedeReaplicar ? `
      <p>Sin embargo, te invitamos a corregir los puntos mencionados y volver a aplicar en el futuro.</p>
    ` : ''}

    ${data.contactoEmail ? `
      <p>Si tienes alguna pregunta o necesitas más información, por favor contacta a <a href="mailto:${data.contactoEmail}">${data.contactoEmail}</a>.</p>
    ` : ''}

    <p>Agradecemos tu interés en trabajar con nosotros.</p>

    <p>Saludos cordiales,</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Actualización de tu solicitud');
}

// ==================== EXPORTAR ====================

export default {
  getWelcomeEmail,
  getInvitationEmail,
  getDocumentRequestEmail,
  getApprovalEmail,
  getRejectionEmail,
};
