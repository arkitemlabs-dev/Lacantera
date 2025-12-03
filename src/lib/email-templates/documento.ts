// src/lib/email-templates/documento.ts
// Templates de email para gestión de documentos

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

// ==================== TIPOS ====================

export type DocumentoAprobadoEmailData = {
  proveedorNombre: string;
  nombreDocumento: string;
  tipoDocumento: string;
  fechaAprobacion: string;
  comentarios?: string;
  loginUrl: string;
};

export type DocumentoRechazadoEmailData = {
  proveedorNombre: string;
  nombreDocumento: string;
  tipoDocumento: string;
  fechaRechazo: string;
  motivoRechazo: string;
  loginUrl: string;
};

export type DocumentoVencidoEmailData = {
  proveedorNombre: string;
  documentosVencidos: Array<{
    nombreDocumento: string;
    tipoDocumento: string;
    fechaVencimiento: string;
  }>;
  loginUrl: string;
};

export type DocumentoProximoVencerEmailData = {
  proveedorNombre: string;
  documentosProximos: Array<{
    nombreDocumento: string;
    tipoDocumento: string;
    fechaVencimiento: string;
    diasRestantes: number;
  }>;
  loginUrl: string;
};

export type DocumentoSolicitadoEmailData = {
  proveedorNombre: string;
  tiposDocumento: string[];
  empresaNombre: string;
  fechaLimite?: string;
  loginUrl: string;
};

// ==================== TEMPLATES ====================

/**
 * Email de documento aprobado
 */
export function getDocumentoAprobadoEmail(
  data: DocumentoAprobadoEmailData
): string {
  const content = `
    <h2 style="color: #16a34a; margin-bottom: 16px;">✓ Documento Aprobado</h2>

    <p>Hola <strong>${data.proveedorNombre}</strong>,</p>

    <p>Tu documento ha sido aprobado exitosamente:</p>

    ${getCard(`
      <p style="margin: 0 0 8px 0;">
        <strong>Documento:</strong> ${data.nombreDocumento}
      </p>
      <p style="margin: 0 0 8px 0;">
        <strong>Tipo:</strong> ${data.tipoDocumento}
      </p>
      <p style="margin: 0;">
        <strong>Fecha de aprobación:</strong> ${data.fechaAprobacion}
      </p>
      ${data.comentarios ? `
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
        <p style="margin: 0;">
          <strong>Comentarios:</strong><br/>
          ${data.comentarios}
        </p>
      ` : ''}
    `)}

    ${getAlert('success', `
      <strong>¡Todo listo!</strong><br/>
      Tu documento ha sido aprobado y está activo en el sistema.
    `)}

    ${getButton(data.loginUrl, 'Ver mis documentos')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>
  `;

  return getBaseTemplate(content, 'Documento Aprobado');
}

/**
 * Email de documento rechazado
 */
export function getDocumentoRechazadoEmail(
  data: DocumentoRechazadoEmailData
): string {
  const content = `
    <h2 style="color: #dc2626; margin-bottom: 16px;">✗ Documento Rechazado</h2>

    <p>Hola <strong>${data.proveedorNombre}</strong>,</p>

    <p>Lamentamos informarte que tu documento no ha sido aprobado:</p>

    ${getCard(`
      <p style="margin: 0 0 8px 0;">
        <strong>Documento:</strong> ${data.nombreDocumento}
      </p>
      <p style="margin: 0 0 8px 0;">
        <strong>Tipo:</strong> ${data.tipoDocumento}
      </p>
      <p style="margin: 0;">
        <strong>Fecha de rechazo:</strong> ${data.fechaRechazo}
      </p>
    `)}

    ${getAlert('error', `
      <strong>Motivo del rechazo:</strong><br/>
      ${data.motivoRechazo}
    `)}

    <p><strong>Acción requerida:</strong></p>
    <p>Por favor, revisa los comentarios anteriores, corrige el documento y vuelve a subirlo.</p>

    ${getButton(data.loginUrl, 'Subir nuevo documento')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Si necesitas ayuda o aclaraciones, contáctanos.
    </p>
  `;

  return getBaseTemplate(content, 'Documento Rechazado');
}

/**
 * Email de documentos vencidos
 */
export function getDocumentoVencidoEmail(
  data: DocumentoVencidoEmailData
): string {
  const documentosList = data.documentosVencidos
    .map(
      (doc) => `
      <div style="padding: 12px; background: #fef2f2; border-left: 4px solid #dc2626; margin-bottom: 8px; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; font-weight: 600;">${doc.tipoDocumento}</p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Archivo: ${doc.nombreDocumento}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #dc2626;">
          Venció el: ${doc.fechaVencimiento}
        </p>
      </div>
    `
    )
    .join('');

  const content = `
    <h2 style="color: #dc2626; margin-bottom: 16px;">⚠️ Documentos Vencidos</h2>

    <p>Hola <strong>${data.proveedorNombre}</strong>,</p>

    <p>Los siguientes documentos han vencido y requieren tu atención inmediata:</p>

    ${documentosList}

    ${getAlert('error', `
      <strong>Acción urgente requerida</strong><br/>
      Tu cuenta podría ser suspendida si no actualizas estos documentos.
    `)}

    ${getButton(data.loginUrl, 'Actualizar documentos ahora')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Para evitar interrupciones en tu servicio, actualiza tus documentos lo antes posible.
    </p>
  `;

  return getBaseTemplate(content, 'Documentos Vencidos - Acción Requerida');
}

/**
 * Email de documentos próximos a vencer
 */
export function getDocumentoProximoVencerEmail(
  data: DocumentoProximoVencerEmailData
): string {
  const documentosList = data.documentosProximos
    .map(
      (doc) => `
      <div style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; margin-bottom: 8px; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; font-weight: 600;">${doc.tipoDocumento}</p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Archivo: ${doc.nombreDocumento}
        </p>
        <p style="margin: 4px 0 0 0; font-size: 14px; color: #f59e0b;">
          Vence el: ${doc.fechaVencimiento} (${doc.diasRestantes} días restantes)
        </p>
      </div>
    `
    )
    .join('');

  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 16px;">🔔 Recordatorio de Vencimiento</h2>

    <p>Hola <strong>${data.proveedorNombre}</strong>,</p>

    <p>Los siguientes documentos están próximos a vencer:</p>

    ${documentosList}

    ${getAlert('warning', `
      <strong>Recordatorio</strong><br/>
      Renueva estos documentos antes de su vencimiento para evitar interrupciones.
    `)}

    ${getButton(data.loginUrl, 'Renovar documentos')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Te recomendamos actualizar tus documentos con anticipación.
    </p>
  `;

  return getBaseTemplate(content, 'Recordatorio: Documentos Próximos a Vencer');
}

/**
 * Email solicitando documentos
 */
export function getDocumentoSolicitadoEmail(
  data: DocumentoSolicitadoEmailData
): string {
  const tiposList = data.tiposDocumento
    .map((tipo) => `<li style="margin-bottom: 4px;">${tipo}</li>`)
    .join('');

  const content = `
    <h2 style="color: #2563eb; margin-bottom: 16px;">📄 Documentos Solicitados</h2>

    <p>Hola <strong>${data.proveedorNombre}</strong>,</p>

    <p>
      <strong>${data.empresaNombre}</strong> te solicita que subas los siguientes documentos
      al portal de proveedores:
    </p>

    ${getCard(`
      <p style="margin: 0 0 8px 0;"><strong>Documentos requeridos:</strong></p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px;">
        ${tiposList}
      </ul>
      ${data.fechaLimite ? `
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
        <p style="margin: 0; color: #dc2626;">
          <strong>Fecha límite:</strong> ${data.fechaLimite}
        </p>
      ` : ''}
    `)}

    ${getAlert('info', `
      <strong>Importante</strong><br/>
      Estos documentos son necesarios para continuar con el proceso de homologación.
    `)}

    ${getButton(data.loginUrl, 'Subir documentos')}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Si tienes dudas sobre los documentos requeridos, contáctanos.
    </p>
  `;

  return getBaseTemplate(content, 'Documentos Solicitados');
}
