// src/types/backend.ts
import { Timestamp } from 'firebase/firestore';

// ==================== USUARIOS ====================

export type UserRole = 'proveedor' | 'admin_super' | 'admin_compras' | 'admin_contabilidad';
export type UserType = 'Proveedor' | 'Administrador';

export interface BaseUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  userType: UserType;
  empresa: string;
  isActive: boolean;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ProveedorUser extends BaseUser {
  userType: 'Proveedor';
  role: 'proveedor';
  rfc: string;
  razonSocial: string;
  telefono?: string;
  direccion?: {
    calle: string;
    ciudad: string;
    estado: string;
    cp: string;
  };
  status: 'activo' | 'pendiente_validacion' | 'rechazado' | 'suspendido';
  documentosValidados: boolean;
}

export interface AdminUser extends BaseUser {
  userType: 'Administrador';
  role: 'admin_super' | 'admin_compras' | 'admin_contabilidad';
}

export type User = ProveedorUser | AdminUser;

// ==================== DOCUMENTACIÓN ====================

export type TipoDocumentoProveedor =
  | 'acta_constitutiva'
  | 'comprobante_domicilio'
  | 'identificacion_representante'
  | 'constancia_fiscal'
  | 'caratula_bancaria';

export type StatusDocumento = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocumentoProveedor {
  id: string;
  proveedorId: string;
  tipoDocumento: TipoDocumentoProveedor;
  archivoUrl: string;
  archivoNombre: string;
  archivoTipo: string;
  status: StatusDocumento;
  comentarios?: string;
  revisadoPor?: string;
  fechaRevision?: Timestamp | Date;
  uploadedAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ==================== ÓRDENES DE COMPRA ====================

export type StatusOrdenCompra =
  | 'pendiente_aceptacion'
  | 'aceptada'
  | 'rechazada'
  | 'en_proceso'
  | 'completada'
  | 'cancelada';

export type Moneda = 'MXN' | 'USD';

export interface ConceptoOrdenCompra {
  clave: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  importe: number;
}

export interface OrdenCompra {
  id: string;
  ordenId: string;
  folio: string;
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  empresaId: string;
  empresaRazonSocial: string;
  fecha: Timestamp | Date;
  fechaEntrega: Timestamp | Date;
  montoTotal: number;
  moneda: Moneda;
  conceptos: ConceptoOrdenCompra[];
  status: StatusOrdenCompra;
  facturada: boolean;
  facturaId?: string;
  observaciones?: string;
  archivoOCUrl?: string;
  intelisisId: string;
  ultimaSincronizacion: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string;
}

// ==================== FACTURAS ====================

export type StatusFactura =
  | 'pendiente_revision'
  | 'aprobada'
  | 'rechazada'
  | 'pagada'
  | 'cancelada';

export type EstatusSAT = 'vigente' | 'cancelada';

export interface Factura {
  id: string;
  facturaId: string;
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  empresaId: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: Timestamp | Date;
  subtotal: number;
  iva: number;
  total: number;
  moneda: Moneda;
  tipoCambio?: number;
  xmlUrl: string;
  pdfUrl: string;
  validadaSAT: boolean;
  estatusSAT?: EstatusSAT;
  fechaValidacionSAT?: Timestamp | Date;
  ordenCompraId?: string;
  status: StatusFactura;
  motivoRechazo?: string;
  pagada: boolean;
  fechaPago?: Timestamp | Date;
  complementoPagoId?: string;
  revisadoPor?: string;
  fechaRevision?: Timestamp | Date;
  observaciones?: string;
  intelisisId?: string;
  ultimaSincronizacion?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  uploadedBy: string;
}

// ==================== COMPLEMENTOS Y COMPROBANTES ====================

export type StatusComplementoPago = 'pendiente_revision' | 'aprobado' | 'rechazado';
export type FormaPagoComprobante = 'transferencia' | 'cheque' | 'efectivo';
export type StatusComprobante = 'pendiente_confirmacion' | 'confirmado' | 'rechazado';

export interface FacturaRelacionada {
  facturaId: string;
  uuid: string;
  serie?: string;
  folio: string;
  monedaDR: string;
  importePagado: number;
  importeSaldoAnterior: number;
  importeSaldoInsoluto: number;
}

export interface ComplementoPago {
  id: string;
  complementoId: string;
  emisorRFC: string;
  emisorRazonSocial: string;
  empresaId: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  proveedorId: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: Timestamp | Date;
  formaPago: string;
  metodoPago: 'PUE' | 'PPD';
  moneda: Moneda;
  monto: number;
  facturasRelacionadas: FacturaRelacionada[];
  xmlUrl: string;
  pdfUrl: string;
  comprobanteUrl?: string;
  validadoSAT: boolean;
  estatusSAT?: EstatusSAT;
  status: StatusComplementoPago;
  intelisisId?: string;
  ultimaSincronizacion?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  uploadedBy: string;
}

export interface ComprobantePago {
  id: string;
  comprobanteId: string;
  empresaId: string;
  empresaRazonSocial: string;
  proveedorId: string;
  proveedorRFC: string;
  fecha: Timestamp | Date;
  monto: number;
  moneda: Moneda;
  formaPago: FormaPagoComprobante;
  referencia?: string;
  archivoUrl: string;
  facturasIds: string[];
  status: StatusComprobante;
  createdAt: Timestamp | Date;
  uploadedBy: string;
}

// ==================== MENSAJERÍA ====================

export interface ArchivoMensaje {
  nombre: string;
  url: string;
  tipo: string;
  tamanio: number;
}

export interface Mensaje {
  id: string;
  mensajeId: string;
  conversacionId: string;
  remitenteId: string;
  remitenteNombre: string;
  remitenteRol: string;
  destinatarioId: string;
  destinatarioNombre: string;
  mensaje: string;
  asunto?: string;
  archivos?: ArchivoMensaje[];
  leido: boolean;
  fechaLectura?: Timestamp | Date;
  createdAt: Timestamp | Date;
}

export interface ParticipanteConversacion {
  uid: string;
  nombre: string;
  rol: string;
}

export interface Conversacion {
  id: string;
  conversacionId: string;
  participantes: string[];
  participantesInfo: ParticipanteConversacion[];
  ultimoMensaje: string;
  ultimoMensajeFecha: Timestamp | Date;
  ultimoMensajeRemitente: string;
  activa: boolean;
  noLeidos: {
    [uid: string]: number;
  };
  asunto: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ==================== NOTIFICACIONES ====================

export type TipoNotificacion =
  | 'nueva_oc'
  | 'factura_aprobada'
  | 'factura_rechazada'
  | 'nuevo_mensaje'
  | 'pago_recibido'
  | 'documento_validado'
  | 'documento_rechazado'
  | 'sistema';

export interface Notificacion {
  id: string;
  notificacionId: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  link?: string;
  datos?: Record<string, any>;
  leida: boolean;
  fechaLectura?: Timestamp | Date;
  emailEnviado: boolean;
  fechaEnvioEmail?: Timestamp | Date;
  createdAt: Timestamp | Date;
}
