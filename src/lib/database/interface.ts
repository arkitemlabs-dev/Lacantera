// src/lib/database/interface.ts
// Interfaces genéricas para base de datos (agnósticas del proveedor)

import type {
  Factura,
  OrdenCompra,
  DocumentoProveedor,
  Mensaje,
  Conversacion,
  Notificacion,
  ComprobantePago,
  ComplementoPago,
  ProveedorUser,
  AdminUser,
} from '@/types/backend';

// ==================== INTERFACES MULTIEMPRESA ====================
export interface Empresa {
  id: string;
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
  activa: boolean;
  configuracion?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UsuarioEmpresa {
  id: string;
  usuarioId: string;
  empresaId: string;
  activo: boolean;
  createdAt: Date;
}

// ==================== INTERFACE PRINCIPAL ====================

export interface Database {
  // ==================== PROVEEDORES ====================
  getProveedor(uid: string): Promise<ProveedorUser | null>;
  updateProveedor(uid: string, data: Partial<ProveedorUser>): Promise<void>;
  getProveedores(filters?: ProveedorFilters): Promise<ProveedorUser[]>;
  updateProveedorStatus(uid: string, status: ProveedorUser['status']): Promise<void>;
  
  // ==================== EMPRESAS ====================
  createEmpresa(data: Omit<Empresa, 'id'>): Promise<string>;
  getEmpresa(id: string): Promise<Empresa | null>;
  getEmpresaByCodigo(codigo: string): Promise<Empresa | null>;
  getEmpresas(filters?: { activa?: boolean }): Promise<Empresa[]>;
  updateEmpresa(id: string, data: Partial<Empresa>): Promise<void>;
  
  // ==================== USUARIO-EMPRESA ====================
  createUsuarioEmpresa(data: Omit<UsuarioEmpresa, 'id'>): Promise<string>;
  getEmpresasByUsuario(usuarioId: string): Promise<UsuarioEmpresa[]>;
  updateUsuarioEmpresa(usuarioId: string, empresaId: string, data: Partial<UsuarioEmpresa>): Promise<void>;
  
  // ==================== DOCUMENTOS DE PROVEEDORES ====================
  createDocumento(data: Omit<DocumentoProveedor, 'id'>): Promise<string>;
  getDocumentosByProveedor(proveedorId: string): Promise<DocumentoProveedor[]>;
  updateDocumento(id: string, data: Partial<DocumentoProveedor>): Promise<void>;
  deleteDocumento(id: string): Promise<void>;
  
  // ==================== ÓRDENES DE COMPRA ====================
  createOrdenCompra(data: Omit<OrdenCompra, 'id'>): Promise<string>;
  getOrdenCompra(id: string): Promise<OrdenCompra | null>;
  getOrdenesCompraByProveedor(proveedorId: string, filters?: OrdenCompraFilters): Promise<OrdenCompra[]>;
  getOrdenesCompraByEmpresa(empresaId: string, filters?: OrdenCompraFilters): Promise<OrdenCompra[]>;
  getAllOrdenesCompra(filters?: OrdenCompraFilters): Promise<OrdenCompra[]>;
  updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<void>;
  
  // ==================== FACTURAS ====================
  createFactura(data: Omit<Factura, 'id'>): Promise<string>;
  getFactura(id: string): Promise<Factura | null>;
  getFacturasByProveedor(proveedorId: string, filters?: FacturaFilters): Promise<Factura[]>;
  getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters): Promise<Factura[]>;
  getAllFacturas(filters?: FacturaFilters): Promise<Factura[]>;
  updateFactura(id: string, data: Partial<Factura>): Promise<void>;
  getFacturaByUUID(uuid: string): Promise<Factura | null>;
  
  // ==================== COMPLEMENTOS DE PAGO ====================
  createComplementoPago(data: Omit<ComplementoPago, 'id'>): Promise<string>;
  getComplementosPagoByProveedor(proveedorId: string): Promise<ComplementoPago[]>;
  getComplementosPagoByEmpresa(empresaId: string): Promise<ComplementoPago[]>;
  updateComplementoPago(id: string, data: Partial<ComplementoPago>): Promise<void>;
  
  // ==================== COMPROBANTES DE PAGO ====================
  createComprobantePago(data: Omit<ComprobantePago, 'id'>): Promise<string>;
  getComprobantesPagoByProveedor(proveedorId: string): Promise<ComprobantePago[]>;
  getComprobantesPagoByEmpresa(empresaId: string): Promise<ComprobantePago[]>;
  updateComprobantePago(id: string, data: Partial<ComprobantePago>): Promise<void>;
  
  // ==================== MENSAJERÍA ====================
  createConversacion(data: Omit<Conversacion, 'id'>): Promise<string>;
  getConversacion(id: string): Promise<Conversacion | null>;
  getConversacionesByUsuario(usuarioId: string): Promise<Conversacion[]>;
  updateConversacion(id: string, data: Partial<Conversacion>): Promise<void>;
  
  createMensaje(data: Omit<Mensaje, 'id'>): Promise<string>;
  getMensajesByConversacion(conversacionId: string, limit?: number): Promise<Mensaje[]>;
  marcarMensajeComoLeido(id: string): Promise<void>;
  
  // ==================== NOTIFICACIONES ====================
  createNotificacion(data: Omit<Notificacion, 'id'>): Promise<string>;
  getNotificacionesByUsuario(usuarioId: string, limit?: number): Promise<Notificacion[]>;
  marcarNotificacionComoLeida(id: string): Promise<void>;
  marcarTodasNotificacionesComoLeidas(usuarioId: string): Promise<void>;
  getNotificacionesNoLeidas(usuarioId: string): Promise<number>;
}

// ==================== FILTROS ====================

export interface ProveedorFilters {
  status?: ProveedorUser['status'] | ProveedorUser['status'][];
  empresa?: string;
  documentosValidados?: boolean;
  searchTerm?: string;
}

export interface OrdenCompraFilters {
  status?: OrdenCompra['status'] | OrdenCompra['status'][];
  fechaDesde?: Date;
  fechaHasta?: Date;
  searchTerm?: string;
  facturada?: boolean;
}

export interface FacturaFilters {
  status?: Factura['status'] | Factura['status'][];
  fechaDesde?: Date;
  fechaHasta?: Date;
  searchTerm?: string;
  pagada?: boolean;
  validadaSAT?: boolean;
}

// ==================== HELPERS ====================

export interface CreateFacturaInput {
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  receptorRFC: string;
  receptorRazonSocial: string;
  empresaId: string;
  uuid: string;
  serie?: string;
  folio: string;
  fecha: Date;
  subtotal: number;
  iva: number;
  total: number;
  moneda: 'MXN' | 'USD';
  tipoCambio?: number;
  xmlUrl: string;
  pdfUrl: string;
  ordenCompraId?: string;
  observaciones?: string;
  uploadedBy: string;
}

export interface CreateOrdenCompraInput {
  ordenId: string;
  folio: string;
  proveedorId: string;
  proveedorRFC: string;
  proveedorRazonSocial: string;
  empresaId: string;
  empresaRazonSocial: string;
  fecha: Date;
  fechaEntrega: Date;
  montoTotal: number;
  moneda: 'MXN' | 'USD';
  conceptos: Array<{
    clave: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    importe: number;
  }>;
  observaciones?: string;
  intelisisId: string;
  createdBy: string;
}