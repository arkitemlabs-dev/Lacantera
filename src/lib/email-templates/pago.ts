// src/lib/email-templates/pago.ts
// Templates de email para pagos

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

// ==================== PAGO PROGRAMADO ====================

export interface PagoProgramadoEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  facturas: Array<{
    folio: string;
    uuid: string;
    monto: number;
  }>;
  montoTotal: number;
  fechaPago: Date;
  metodoPago: string;
  referencia?: string;
  pagoUrl: string;
}

export function getPagoProgramadoEmail(data: PagoProgramadoEmailData): string {
  const content = `
    <h1>Pago Programado 📅</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('Tu pago ha sido programado y será procesado pronto.', 'success')}

    <p>Te informamos que <strong>${data.empresaCliente}</strong> ha programado un pago a favor de <strong>${data.nombreProveedor}</strong>.</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Pago:</td>
          <td style="padding: 8px 0; text-align: right; color: #667eea; font-size: 16px; font-weight: bold;">
            ${data.fechaPago.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Método de Pago:</td>
          <td style="padding: 8px 0; text-align: right;">${data.metodoPago}</td>
        </tr>
        ${data.referencia ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Referencia:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace;">${data.referencia}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #667eea;">
          <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Monto Total:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 24px; font-weight: bold; color: #28a745;">
            $${data.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
      </table>
    `)}

    <h2>Facturas incluidas en este pago:</h2>
    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #dee2e6;">
            <th style="padding: 8px; text-align: left;">Folio</th>
            <th style="padding: 8px; text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${data.facturas.map(factura => `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 8px;">
                ${factura.folio}<br>
                <small style="color: #6c757d; font-family: monospace; font-size: 10px;">${factura.uuid.substring(0, 20)}...</small>
              </td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">
                $${factura.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver Detalles del Pago', data.pagoUrl)}
    </div>

    <p>Te notificaremos cuando el pago haya sido procesado y el complemento de pago esté disponible.</p>

    <p>Gracias por tu paciencia.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Pago programado');
}

// ==================== PAGO REALIZADO ====================

export interface PagoRealizadoEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  facturas: Array<{
    folio: string;
    uuid: string;
    monto: number;
  }>;
  montoTotal: number;
  fechaPago: Date;
  metodoPago: string;
  referencia: string;
  uuidComplemento: string;
  complementoUrl: string;
  pagoUrl: string;
}

export function getPagoRealizadoEmail(data: PagoRealizadoEmailData): string {
  const content = `
    <h1>¡Pago Realizado! 💰</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('¡Tu pago ha sido procesado exitosamente!', 'success')}

    <p><strong>${data.empresaCliente}</strong> ha realizado un pago a favor de <strong>${data.nombreProveedor}</strong>.</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Pago:</td>
          <td style="padding: 8px 0; text-align: right;">
            ${data.fechaPago.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Método de Pago:</td>
          <td style="padding: 8px 0; text-align: right;">${data.metodoPago}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Referencia:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-weight: bold;">
            ${data.referencia}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">UUID Complemento:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 11px;">
            ${data.uuidComplemento}
          </td>
        </tr>
        <tr style="border-top: 2px solid #667eea;">
          <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Monto Pagado:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 28px; font-weight: bold; color: #28a745;">
            $${data.montoTotal.toLocaleString('es-MX', { minimumFractionDigals: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
      </table>
    `)}

    <h2>Facturas pagadas:</h2>
    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #dee2e6;">
            <th style="padding: 8px; text-align: left;">Folio</th>
            <th style="padding: 8px; text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${data.facturas.map(factura => `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 8px;">
                ${factura.folio}<br>
                <small style="color: #6c757d; font-family: monospace; font-size: 10px;">${factura.uuid.substring(0, 20)}...</small>
              </td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">
                $${factura.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `)}

    ${getAlert('El complemento de pago (CFDI) está disponible para descarga.', 'info')}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Descargar Complemento de Pago', data.complementoUrl, 'success')}
      <br><br>
      ${getButton('Ver Detalles del Pago', data.pagoUrl, 'secondary')}
    </div>

    <p><strong>Importante:</strong> Por favor descarga el complemento de pago (XML) para tus registros contables.</p>

    <p>Gracias por tu confianza.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, '¡Pago realizado!');
}

// ==================== COMPLEMENTO DE PAGO DISPONIBLE ====================

export interface ComplementoDisponibleEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  folioComplemento: string;
  uuidComplemento: string;
  fechaEmision: Date;
  montoTotal: number;
  facturasRelacionadas: number;
  complementoUrl: string;
  xmlUrl: string;
  pdfUrl: string;
}

export function getComplementoDisponibleEmail(data: ComplementoDisponibleEmailData): string {
  const content = `
    <h1>Complemento de Pago Disponible 📄</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('El complemento de pago ya está disponible para descarga.', 'success')}

    <p>El complemento de pago (CFDI) correspondiente a tu(s) factura(s) ya está listo.</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Folio Complemento:</td>
          <td style="padding: 8px 0; text-align: right;">${data.folioComplemento}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">UUID:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 11px;">
            ${data.uuidComplemento}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Emisión:</td>
          <td style="padding: 8px 0; text-align: right;">
            ${data.fechaEmision.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Facturas Incluidas:</td>
          <td style="padding: 8px 0; text-align: right;">${data.facturasRelacionadas}</td>
        </tr>
        <tr style="border-top: 2px solid #667eea;">
          <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Monto Total:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 24px; font-weight: bold; color: #28a745;">
            $${data.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
      </table>
    `)}

    <h2>Descargas disponibles:</h2>
    <div style="text-align: center; margin: 30px 0;">
      ${getButton('📥 Descargar XML', data.xmlUrl, 'success')}
      <br><br>
      ${getButton('📄 Descargar PDF', data.pdfUrl, 'secondary')}
      <br><br>
      ${getButton('👁️ Ver en Sistema', data.complementoUrl, 'secondary')}
    </div>

    ${getAlert('<strong>Importante:</strong> Descarga el archivo XML para timbrar y registrar en tu contabilidad.', 'warning')}

    <p>Si tienes alguna duda sobre el complemento de pago, por favor contacta al equipo de pagos.</p>

    <p>Gracias.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Complemento de pago disponible');
}

// ==================== RECORDATORIO DE PAGO PRÓXIMO ====================

export interface RecordatorioPagoEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  diasParaPago: number;
  fechaPago: Date;
  montoTotal: number;
  cantidadFacturas: number;
  pagoUrl: string;
}

export function getRecordatorioPagoEmail(data: RecordatorioPagoEmailData): string {
  const content = `
    <h1>Recordatorio: Pago Próximo 🔔</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Te recordamos que <strong>${data.empresaCliente}</strong> tiene programado un pago para los próximos días.</p>

    ${getAlert(`El pago será procesado en <strong>${data.diasParaPago} ${data.diasParaPago === 1 ? 'día' : 'días'}</strong>.`, 'info')}

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Pago:</td>
          <td style="padding: 8px 0; text-align: right; color: #667eea; font-size: 16px; font-weight: bold;">
            ${data.fechaPago.toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Facturas a Pagar:</td>
          <td style="padding: 8px 0; text-align: right;">${data.cantidadFacturas}</td>
        </tr>
        <tr style="border-top: 2px solid #667eea;">
          <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">Monto Total:</td>
          <td style="padding: 12px 0; text-align: right; font-size: 24px; font-weight: bold; color: #28a745;">
            $${data.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
      </table>
    `)}

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver Detalles del Pago', data.pagoUrl)}
    </div>

    <p>Te notificaremos cuando el pago sea procesado y el complemento esté disponible.</p>

    <p>Gracias por tu atención.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Recordatorio: Pago próximo');
}

// ==================== EXPORTAR ====================

export default {
  getPagoProgramadoEmail,
  getPagoRealizadoEmail,
  getComplementoDisponibleEmail,
  getRecordatorioPagoEmail,
};
