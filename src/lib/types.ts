
import type { LucideIcon } from 'lucide-react';

export type SupplierStatus = 'active' | 'pending' | 'attention' | 'inactive' | 'review';
export type SupplierType = 'supplies' | 'services' | 'leasing' | 'transport';

export type Supplier = {
  id: string;
  name: string;
  taxId: string;
  contactEmail: string;
  contactName?: string;
  status: SupplierStatus;
  type: SupplierType;
  registrationDate: string;
  spent: number;
  trend: number;
  empresaId: string; // ID de la empresa
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  amount: number;
  entryDate: string;
  status: 'Pendiente pago' | 'En Revisión' | 'Rechazada' | 'Pagada';
  actionable: boolean;
  purchaseOrderIds: string[];
  empresaId: string; // ID de la empresa
};

export type PurchaseOrderStatus = 'Pendiente' | 'Completa' | 'Cancelada';

export type PurchaseOrder = {
  id: string;
  name: string;
  supplierName: string;
  emissionDate: string;
  status: PurchaseOrderStatus;
  amount: number;
  deliveryDate: string;
  area: string;
  invoice?: string;
  createdBy: string;
  budget: number;
  company: string;
  empresaId: string; // ID de la empresa
};

export type PaymentStatus = 'Completo' | 'Pendiente complemento' | 'En Revisión' | 'Rechazada' | 'Pendiente comprobantes';

export type Payment = {
  id: string;
  invoiceIds: string[];
  supplierName: string;
  amount: number;
  executionDate: string;
  status: PaymentStatus;
  method: 'Transferencia' | 'Tarjeta de Crédito';
  paymentComplement: boolean;
  paymentReceipt?: boolean;
  empresaId: string; // ID de la empresa
};

export type NotificationType = 'new_supplier' | 'doc_update' | 'invoice_status' | 'new_message' | 'payment_done';

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  date: string; // ISO 8601 string
  read: boolean;
  link: string;
  tag: string;
};


export type NavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  label?: string;
};

// Tipos para multiempresa
export type Empresa = {
  id: string;
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  logo?: string;
  activa: boolean;
  fechaCreacion: string;
};

export type UsuarioEmpresa = {
  usuarioId: string;
  empresaId: string;
  rol: string;
  activo: boolean;
  fechaAsignacion: string;
};

// ============================================================================
// TIPOS PARA TABLAS EXTENDIDAS DEL PORTAL
// ============================================================================

// Extensión de Usuario
export type UsuarioExtension = {
  usuario: string;
  rfc?: string;
  razonSocial?: string;
  telefono?: string;
  direccionCalle?: string;
  direccionCiudad?: string;
  direccionEstado?: string;
  direccionCP?: string;
  avatarURL?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
};

// Extensión de Proveedor
export type ProveedorExtension = {
  proveedor: string;
  categoria?: string;
  statusPortal: 'activo' | 'suspendido' | 'inactivo' | 'en_revision';
  documentosCompletos: boolean;
  fechaUltimaActividad?: string;
  ultimaSincronizacionERP?: string;
  configuracionesJSON?: string;
  createdAt: string;
  updatedAt?: string;
};

// Sesión de Usuario
export type Sesion = {
  id: string;
  usuario: string;
  sessionToken: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  empresaActiva?: string;
  createdAt: string;
};

// Token de Verificación
export type VerificationToken = {
  id: string;
  usuario: string;
  token: string;
  tipoToken: 'email_verification' | 'phone_verification' | 'two_factor';
  expiresAt: string;
  usado: boolean;
  fechaUso?: string;
  createdAt: string;
};

// Token de Reset de Contraseña
export type PasswordResetToken = {
  id: string;
  usuario: string;
  token: string;
  expiresAt: string;
  usedAt?: string;
  ipSolicitud?: string;
  createdAt: string;
};

// Categoría de Proveedor
export type ProveedorCategoria = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  documentosRequeridosJSON?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
};

// Tipo de Documento
export type TipoDocumento = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requeridoPara?: string;
  vigenciaDias?: number;
  ordenPresentacion: number;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
};

// Tipo de Notificación
export type TipoNotificacion = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  templateTitulo?: string;
  templateMensaje?: string;
  colorBadge: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
};

// Documento de Proveedor
export type ProveedorDocumento = {
  id: string;
  documentoID: string;
  proveedor: string;
  usuario: string;
  empresa: string;
  tipoDocumento: string;
  nombreArchivo: string;
  archivoURL: string;
  archivoTipo: string;
  archivoTamanio: number;
  estatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO';
  comentarios?: string;
  fechaVencimiento?: string;
  revisadoPor?: string;
  revisadoPorNombre?: string;
  fechaRevision?: string;
  fechaSubida: string;
  createdAt: string;
  updatedAt?: string;
};

// Conversación
export type Conversacion = {
  id: string;
  conversacionID: string;
  empresa: string;
  participantesJSON: string;
  asunto: string;
  ultimoMensaje?: string;
  ultimoMensajeFecha?: string;
  ultimoMensajeRemitente?: string;
  ultimoMensajeRemitenteNombre?: string;
  activa: boolean;
  noLeidosJSON?: string;
  createdAt: string;
  updatedAt?: string;
};

// Mensaje
export type Mensaje = {
  id: string;
  mensajeID: string;
  conversacionID: string;
  remitenteID: string;
  remitenteNombre: string;
  remitenteRol: string;
  destinatarioID: string;
  destinatarioNombre: string;
  mensaje: string;
  asunto?: string;
  archivosJSON?: string;
  leido: boolean;
  fechaLectura?: string;
  createdAt: string;
};

// Notificación del Portal
export type NotificacionPortal = {
  id: string;
  notificacionID: string;
  usuario: string;
  usuarioNombre: string;
  empresa: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link?: string;
  datosJSON?: string;
  leida: boolean;
  fechaLectura?: string;
  emailEnviado: boolean;
  fechaEnvioEmail?: string;
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
  createdAt: string;
};

// Registro de Auditoría
export type AuditLog = {
  id: string;
  usuario: string;
  usuarioNombre: string;
  empresa?: string;
  accion: string;
  tablaAfectada: string;
  registroID: string;
  valoresAnterioresJSON?: string;
  valoresNuevosJSON?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};

// Configuración
export type Configuracion = {
  id: string;
  empresa: string;
  clave: string;
  valor: string;
  descripcion?: string;
  tipoDato: 'string' | 'number' | 'boolean' | 'json';
  categoria: string;
  modificable: boolean;
  createdAt: string;
  updatedAt?: string;
};

// Factura de Proveedor
export type ProveedorFactura = {
  id: string;
  facturaID: string;
  proveedor: string;
  empresa: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  moneda: string;
  xmlURL: string;
  pdfURL: string;
  validadaSAT: boolean;
  estatusSAT?: string;
  fechaValidacionSAT?: string;
  estatus: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'PAGADA';
  motivoRechazo?: string;
  revisadoPor?: string;
  fechaRevision?: string;
  observaciones?: string;
  pagada: boolean;
  fechaPago?: string;
  complementoPagoID?: string;
  intelisisID?: string;
  cuentaContable?: string;
  subidoPor: string;
  createdAt: string;
  updatedAt?: string;
};

// Complemento de Pago
export type ComplementoPago = {
  id: string;
  complementoID: string;
  emisorRFC: string;
  emisorRazonSocial: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  proveedor: string;
  empresa: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: string;
  formaPago: string;
  metodoPago: string;
  moneda: string;
  monto: number;
  xmlURL: string;
  pdfURL?: string;
  comprobanteURL?: string;
  facturasRelacionadasJSON: string;
  validadoSAT: boolean;
  estatusSAT?: string;
  estatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'APLICADO';
  intelisisID?: string;
  aplicadoContabilidad: boolean;
  fechaAplicacion?: string;
  subidoPor: string;
  createdAt: string;
  updatedAt?: string;
};
