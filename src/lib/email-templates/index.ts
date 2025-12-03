// src/lib/email-templates/index.ts
// Exportación centralizada de todos los templates de email

// Componentes base
export {
  getBaseTemplate,
  getButton,
  getAlert,
  getCard,
  getDivider
} from './base';

// Templates de proveedores
export {
  getWelcomeEmail,
  getInvitationEmail,
  getDocumentRequestEmail,
  getApprovalEmail,
  getRejectionEmail,
  type WelcomeEmailData,
  type InvitationEmailData,
  type DocumentRequestEmailData,
  type ApprovalEmailData,
  type RejectionEmailData,
} from './proveedor';

// Templates de facturas
export {
  getFacturaRecibidaEmail,
  getFacturaAprobadaEmail,
  getFacturaRechazadaEmail,
  getFacturaPendienteEmail,
  type FacturaRecibidaEmailData,
  type FacturaAprobadaEmailData,
  type FacturaRechazadaEmailData,
  type FacturaPendienteEmailData,
} from './factura';

// Templates de pagos
export {
  getPagoProgramadoEmail,
  getPagoRealizadoEmail,
  getComplementoDisponibleEmail,
  getRecordatorioPagoEmail,
  type PagoProgramadoEmailData,
  type PagoRealizadoEmailData,
  type ComplementoDisponibleEmailData,
  type RecordatorioPagoEmailData,
} from './pago';

// Templates de notificaciones
export {
  getMensajeNuevoEmail,
  getNotificacionSistemaEmail,
  getResumenSemanalEmail,
  getCambioPasswordEmail,
  getRecuperarPasswordEmail,
  type MensajeNuevoEmailData,
  type NotificacionSistemaEmailData,
  type ResumenSemanalEmailData,
  type CambioPasswordEmailData,
  type RecuperarPasswordEmailData,
} from './notificacion';

// Templates de documentos
export {
  getDocumentoAprobadoEmail,
  getDocumentoRechazadoEmail,
  getDocumentoVencidoEmail,
  getDocumentoProximoVencerEmail,
  getDocumentoSolicitadoEmail,
  type DocumentoAprobadoEmailData,
  type DocumentoRechazadoEmailData,
  type DocumentoVencidoEmailData,
  type DocumentoProximoVencerEmailData,
  type DocumentoSolicitadoEmailData,
} from './documento';

// ==================== HELPERS ====================

/**
 * Obtiene el template de email apropiado según el tipo
 */
export function getEmailTemplate(
  type: string,
  data: any
): string | null {
  // Mapeo de tipos a funciones de template
  const templates: Record<string, (data: any) => string> = {
    // Proveedores
    'proveedor:welcome': require('./proveedor').getWelcomeEmail,
    'proveedor:invitation': require('./proveedor').getInvitationEmail,
    'proveedor:documentRequest': require('./proveedor').getDocumentRequestEmail,
    'proveedor:approval': require('./proveedor').getApprovalEmail,
    'proveedor:rejection': require('./proveedor').getRejectionEmail,

    // Facturas
    'factura:recibida': require('./factura').getFacturaRecibidaEmail,
    'factura:aprobada': require('./factura').getFacturaAprobadaEmail,
    'factura:rechazada': require('./factura').getFacturaRechazadaEmail,
    'factura:pendiente': require('./factura').getFacturaPendienteEmail,

    // Pagos
    'pago:programado': require('./pago').getPagoProgramadoEmail,
    'pago:realizado': require('./pago').getPagoRealizadoEmail,
    'pago:complemento': require('./pago').getComplementoDisponibleEmail,
    'pago:recordatorio': require('./pago').getRecordatorioPagoEmail,

    // Notificaciones
    'notificacion:mensaje': require('./notificacion').getMensajeNuevoEmail,
    'notificacion:sistema': require('./notificacion').getNotificacionSistemaEmail,
    'notificacion:resumen': require('./notificacion').getResumenSemanalEmail,
    'auth:cambioPassword': require('./notificacion').getCambioPasswordEmail,
    'auth:recuperarPassword': require('./notificacion').getRecuperarPasswordEmail,

    // Documentos
    'documento:aprobado': require('./documento').getDocumentoAprobadoEmail,
    'documento:rechazado': require('./documento').getDocumentoRechazadoEmail,
    'documento:vencido': require('./documento').getDocumentoVencidoEmail,
    'documento:proximoVencer': require('./documento').getDocumentoProximoVencerEmail,
    'documento:solicitado': require('./documento').getDocumentoSolicitadoEmail,
  };

  const templateFn = templates[type];
  if (!templateFn) {
    console.error(`Template no encontrado: ${type}`);
    return null;
  }

  try {
    return templateFn(data);
  } catch (error: any) {
    console.error(`Error generando template ${type}:`, error);
    return null;
  }
}

// ==================== EXPORTAR DEFAULT ====================

export default {
  getBaseTemplate,
  getButton,
  getAlert,
  getCard,
  getDivider,
  getEmailTemplate,
};
