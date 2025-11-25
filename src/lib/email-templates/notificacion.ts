// src/lib/email-templates/notificacion.ts
// Templates de email para notificaciones generales

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

// ==================== MENSAJE NUEVO ====================

export interface MensajeNuevoEmailData {
  nombreDestinatario: string;
  nombreRemitente: string;
  empresaOrigen: string;
  asunto: string;
  mensaje: string;
  fechaEnvio: Date;
  mensajesUrl: string;
}

export function getMensajeNuevoEmail(data: MensajeNuevoEmailData): string {
  const content = `
    <h1>Nuevo Mensaje 💬</h1>

    <p>Hola <strong>${data.nombreDestinatario}</strong>,</p>

    ${getAlert('Tienes un nuevo mensaje en La Cantera.', 'info')}

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">De:</td>
          <td style="padding: 8px 0; text-align: right;">${data.nombreRemitente}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Empresa:</td>
          <td style="padding: 8px 0; text-align: right;">${data.empresaOrigen}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha:</td>
          <td style="padding: 8px 0; text-align: right;">
            ${data.fechaEnvio.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 20px 0 0 0;">
            <strong style="display: block; margin-bottom: 10px;">Asunto:</strong>
            <p style="margin: 0 0 15px 0; font-size: 16px;">${data.asunto}</p>
            <strong style="display: block; margin-bottom: 10px;">Mensaje:</strong>
            <p style="margin: 0; white-space: pre-wrap;">${data.mensaje}</p>
          </td>
        </tr>
      </table>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver y Responder Mensaje', data.mensajesUrl)}
    </div>

    <p class="text-muted" style="font-size: 14px;">
      <strong>Nota:</strong> Este es un resumen del mensaje. Inicia sesión para ver el mensaje completo y responder.
    </p>
  `;

  return getBaseTemplate(content, `Nuevo mensaje de ${data.nombreRemitente}`);
}

// ==================== NOTIFICACIÓN DE SISTEMA ====================

export interface NotificacionSistemaEmailData {
  nombreUsuario: string;
  tipo: 'info' | 'warning' | 'success' | 'danger';
  titulo: string;
  mensaje: string;
  accionTexto?: string;
  accionUrl?: string;
  fecha: Date;
}

export function getNotificacionSistemaEmail(data: NotificacionSistemaEmailData): string {
  const iconos = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    danger: '🚨'
  };

  const content = `
    <h1>${iconos[data.tipo]} ${data.titulo}</h1>

    <p>Hola <strong>${data.nombreUsuario}</strong>,</p>

    ${getAlert(data.mensaje, data.tipo)}

    ${data.accionTexto && data.accionUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        ${getButton(data.accionTexto, data.accionUrl, data.tipo === 'danger' ? 'danger' : 'primary')}
      </div>
    ` : ''}

    <p class="text-muted" style="font-size: 14px;">
      ${data.fecha.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </p>
  `;

  return getBaseTemplate(content, data.titulo);
}

// ==================== RESUMEN SEMANAL ====================

export interface ResumenSemanalEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  semana: string;
  estadisticas: {
    facturasSubidas: number;
    facturasAprobadas: number;
    facturasRechazadas: number;
    facturasPendientes: number;
    montoPagado: number;
    montoProximoPago: number;
  };
  proximosPagos: Array<{
    fecha: Date;
    monto: number;
    facturas: number;
  }>;
  dashboardUrl: string;
}

export function getResumenSemanalEmail(data: ResumenSemanalEmailData): string {
  const content = `
    <h1>Resumen Semanal 📊</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Aquí está el resumen de actividad de <strong>${data.nombreProveedor}</strong> durante la semana del <strong>${data.semana}</strong>.</p>

    <h2>Estadísticas de la Semana</h2>
    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 0;">Facturas subidas</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">
            ${data.estadisticas.facturasSubidas}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 0; color: #28a745;">✅ Facturas aprobadas</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #28a745;">
            ${data.estadisticas.facturasAprobadas}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 0; color: #dc3545;">❌ Facturas rechazadas</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #dc3545;">
            ${data.estadisticas.facturasRechazadas}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 0; color: #ffc107;">⏳ Facturas pendientes</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #ffc107;">
            ${data.estadisticas.facturasPendientes}
          </td>
        </tr>
      </table>
    `)}

    <h2>Información de Pagos</h2>
    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 12px 0;">💰 Monto pagado esta semana</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #28a745;">
            $${data.estadisticas.montoPagado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">📅 Próximo pago programado</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #667eea;">
            $${data.estadisticas.montoProximoPago.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      </table>
    `)}

    ${data.proximosPagos.length > 0 ? `
      <h2>Próximos Pagos Programados</h2>
      ${getCard(`
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #dee2e6;">
              <th style="padding: 8px; text-align: left;">Fecha</th>
              <th style="padding: 8px; text-align: center;">Facturas</th>
              <th style="padding: 8px; text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${data.proximosPagos.map(pago => `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 8px;">
                  ${pago.fecha.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td style="padding: 8px; text-align: center;">${pago.facturas}</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">
                  $${pago.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `)}
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver Dashboard Completo', data.dashboardUrl)}
    </div>

    <p>¡Gracias por usar La Cantera!</p>
  `;

  return getBaseTemplate(content, `Resumen semanal - ${data.semana}`);
}

// ==================== CAMBIO DE CONTRASEÑA ====================

export interface CambioPasswordEmailData {
  nombreUsuario: string;
  email: string;
  fechaCambio: Date;
  ipAddress?: string;
  soporte: string;
}

export function getCambioPasswordEmail(data: CambioPasswordEmailData): string {
  const content = `
    <h1>Cambio de Contraseña 🔐</h1>

    <p>Hola <strong>${data.nombreUsuario}</strong>,</p>

    ${getAlert('Tu contraseña ha sido cambiada exitosamente.', 'success')}

    <p>Te confirmamos que la contraseña de tu cuenta ha sido modificada.</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Email:</td>
          <td style="padding: 8px 0; text-align: right;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha del cambio:</td>
          <td style="padding: 8px 0; text-align: right;">
            ${data.fechaCambio.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </td>
        </tr>
        ${data.ipAddress ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Dirección IP:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace;">${data.ipAddress}</td>
        </tr>
        ` : ''}
      </table>
    `)}

    ${getAlert('Si no realizaste este cambio, por favor contacta inmediatamente a soporte.', 'danger')}

    <p>Para tu seguridad:</p>
    <ul>
      <li>Nunca compartas tu contraseña con nadie</li>
      <li>Usa contraseñas únicas para cada servicio</li>
      <li>Cambia tu contraseña periódicamente</li>
      <li>Activa la autenticación de dos factores si está disponible</li>
    </ul>

    <p>Si necesitas ayuda, contacta a <a href="mailto:${data.soporte}">${data.soporte}</a>.</p>
  `;

  return getBaseTemplate(content, 'Cambio de contraseña');
}

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================

export interface RecuperarPasswordEmailData {
  nombreUsuario: string;
  email: string;
  resetUrl: string;
  expiraEn: number; // minutos
  ipAddress?: string;
}

export function getRecuperarPasswordEmail(data: RecuperarPasswordEmailData): string {
  const content = `
    <h1>Recuperación de Contraseña 🔑</h1>

    <p>Hola <strong>${data.nombreUsuario}</strong>,</p>

    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta <strong>${data.email}</strong>.</p>

    ${getAlert(`Este enlace es válido por <strong>${data.expiraEn} minutos</strong>.`, 'warning')}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Restablecer Contraseña', data.resetUrl, 'primary')}
    </div>

    ${data.ipAddress ? getCard(`
      <p style="margin: 0; font-size: 14px;">
        <strong>Información de la solicitud:</strong><br>
        IP: <code>${data.ipAddress}</code><br>
        Fecha: ${new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    `) : ''}

    ${getAlert('Si no solicitaste este cambio, ignora este correo y tu contraseña permanecerá sin cambios.', 'info')}

    <p><strong>Por seguridad:</strong></p>
    <ul>
      <li>No compartas este enlace con nadie</li>
      <li>El enlace expirará en ${data.expiraEn} minutos</li>
      <li>Si no lo solicitaste, cambia tu contraseña inmediatamente</li>
    </ul>
  `;

  return getBaseTemplate(content, 'Recuperar contraseña');
}

// ==================== EXPORTAR ====================

export default {
  getMensajeNuevoEmail,
  getNotificacionSistemaEmail,
  getResumenSemanalEmail,
  getCambioPasswordEmail,
  getRecuperarPasswordEmail,
};
