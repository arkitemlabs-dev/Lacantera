// src/lib/email-templates/factura.ts
// Templates de email para facturas

import { getBaseTemplate, getButton, getAlert, getCard } from './base';

// ==================== FACTURA RECIBIDA ====================

export interface FacturaRecibidaEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  folioFactura: string;
  uuid: string;
  total: number;
  fechaRecepcion: Date;
  facturaUrl: string;
}

export function getFacturaRecibidaEmail(data: FacturaRecibidaEmailData): string {
  const content = `
    <h1>Factura Recibida Exitosamente ✅</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('Tu factura ha sido recibida y está siendo procesada.', 'success')}

    <p>Confirmamos que hemos recibido la siguiente factura de <strong>${data.nombreProveedor}</strong>:</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Folio:</td>
          <td style="padding: 8px 0; text-align: right;">${data.folioFactura}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">UUID:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.uuid}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Total:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #28a745;">
            $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Recepción:</td>
          <td style="padding: 8px 0; text-align: right;">
            ${data.fechaRecepcion.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </td>
        </tr>
      </table>
    `)}

    <h2>¿Qué sigue?</h2>
    <ol>
      <li><strong>Validación SAT:</strong> Verificaremos la factura con el SAT</li>
      <li><strong>Revisión interna:</strong> Nuestro equipo revisará los datos</li>
      <li><strong>Aprobación:</strong> Una vez aprobada, entrará al calendario de pagos</li>
      <li><strong>Notificación:</strong> Te notificaremos cualquier cambio de estatus</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver Detalles de la Factura', data.facturaUrl)}
    </div>

    <p>Puedes consultar el estado de tu factura en cualquier momento desde tu panel de control.</p>

    <p>Gracias por tu colaboración.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, `Factura ${data.folioFactura} recibida`);
}

// ==================== FACTURA APROBADA ====================

export interface FacturaAprobadaEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  folioFactura: string;
  uuid: string;
  total: number;
  fechaPagoEstimada?: Date;
  ordenCompraRelacionada?: string;
  facturaUrl: string;
}

export function getFacturaAprobadaEmail(data: FacturaAprobadaEmailData): string {
  const content = `
    <h1>¡Factura Aprobada! 🎉</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    ${getAlert('¡Buenas noticias! Tu factura ha sido aprobada.', 'success')}

    <p>La factura <strong>${data.folioFactura}</strong> ha sido aprobada y procesada exitosamente.</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Folio:</td>
          <td style="padding: 8px 0; text-align: right;">${data.folioFactura}</td>
        </tr>
        ${data.ordenCompraRelacionada ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Orden de Compra:</td>
          <td style="padding: 8px 0; text-align: right;">${data.ordenCompraRelacionada}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Total Aprobado:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: bold; color: #28a745;">
            $${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </td>
        </tr>
        ${data.fechaPagoEstimada ? `
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fecha de Pago Estimada:</td>
          <td style="padding: 8px 0; text-align: right; color: #667eea; font-weight: bold;">
            ${data.fechaPagoEstimada.toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </td>
        </tr>
        ` : ''}
      </table>
    `)}

    <h2>Próximos pasos:</h2>
    <ul>
      <li>Tu factura ha sido ingresada al calendario de pagos</li>
      <li>Recibirás una notificación cuando se procese el pago</li>
      <li>Podrás descargar el complemento de pago desde tu panel</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Ver Detalles', data.facturaUrl)}
    </div>

    <p>Gracias por tu paciencia.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, `Factura ${data.folioFactura} aprobada`);
}

// ==================== FACTURA RECHAZADA ====================

export interface FacturaRechazadaEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  folioFactura: string;
  uuid: string;
  motivo: string;
  detalleRechazo?: string;
  puedeCorregir: boolean;
  facturaUrl: string;
}

export function getFacturaRechazadaEmail(data: FacturaRechazadaEmailData): string {
  const content = `
    <h1>Factura Requiere Atención ⚠️</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Después de revisar la factura <strong>${data.folioFactura}</strong>, hemos identificado algunos problemas que necesitan ser corregidos.</p>

    ${getAlert(`<strong>Motivo del rechazo:</strong> ${data.motivo}`, 'warning')}

    ${data.detalleRechazo ? getCard(`
      <h3 style="margin: 0 0 10px 0;">Detalles:</h3>
      <p style="margin: 0;">${data.detalleRechazo}</p>
    `) : ''}

    ${data.puedeCorregir ? `
      <h2>¿Qué puedes hacer?</h2>
      <ol>
        <li>Revisa el motivo del rechazo</li>
        <li>Corrige la información o genera una nueva factura</li>
        <li>Vuelve a subir la factura corregida</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        ${getButton('Ver Detalles y Corregir', data.facturaUrl)}
      </div>
    ` : `
      ${getAlert('Por favor, contacta al equipo de compras para más información.', 'info')}
    `}

    <p>Si tienes alguna duda sobre el motivo del rechazo, no dudes en contactarnos.</p>

    <p>Estamos para ayudarte.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, `Factura ${data.folioFactura} requiere corrección`);
}

// ==================== RECORDATORIO DE FACTURA PENDIENTE ====================

export interface FacturaPendienteEmailData {
  nombreProveedor: string;
  nombreContacto: string;
  empresaCliente: string;
  ordenesCompra: Array<{
    numero: string;
    fecha: Date;
    total: number;
  }>;
  diasTranscurridos: number;
  uploadUrl: string;
}

export function getFacturaPendienteEmail(data: FacturaPendienteEmailData): string {
  const content = `
    <h1>Recordatorio: Facturas Pendientes 📋</h1>

    <p>Hola <strong>${data.nombreContacto}</strong>,</p>

    <p>Queremos recordarte que tienes órdenes de compra pendientes de facturación:</p>

    ${getCard(`
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #dee2e6;">
            <th style="padding: 10px; text-align: left;">Orden de Compra</th>
            <th style="padding: 10px; text-align: left;">Fecha</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.ordenesCompra.map(orden => `
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 10px;">${orden.numero}</td>
              <td style="padding: 10px;">${orden.fecha.toLocaleDateString('es-MX')}</td>
              <td style="padding: 10px; text-align: right; font-weight: bold;">
                $${orden.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `)}

    ${getAlert(`Han transcurrido ${data.diasTranscurridos} días desde la(s) orden(es) de compra.`, 'info')}

    <h2>Para subir tu factura:</h2>
    <ol>
      <li>Prepara tus archivos XML y PDF</li>
      <li>Accede a tu panel de control</li>
      <li>Sube la factura y relacionala con la orden de compra</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      ${getButton('Subir Factura Ahora', data.uploadUrl)}
    </div>

    <p>Si ya enviaste la factura por otro medio, por favor ignora este mensaje.</p>

    <p>Gracias por tu atención.</p>
    <p><strong>El equipo de ${data.empresaCliente}</strong></p>
  `;

  return getBaseTemplate(content, 'Recordatorio: Facturas pendientes');
}

// ==================== EXPORTAR ====================

export default {
  getFacturaRecibidaEmail,
  getFacturaAprobadaEmail,
  getFacturaRechazadaEmail,
  getFacturaPendienteEmail,
};
