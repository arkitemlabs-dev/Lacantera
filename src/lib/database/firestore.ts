// src/lib/database/firestore.ts
// Implementación de Database usando Firestore

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  type WhereFilterOp,
} from 'firebase/firestore';

import type {
  Database,
  ProveedorFilters,
  OrdenCompraFilters,
  FacturaFilters,
  CreateFacturaInput,
  CreateOrdenCompraInput,
} from './interface';

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

// Helper: Convertir Timestamp de Firestore a Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Helper: Convertir Date a Timestamp para Firestore
const dateToTimestamp = (date: Date | Timestamp): Timestamp => {
  if (date instanceof Timestamp) {
    return date;
  }
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
};

export class FirestoreDatabase implements Database {
  // ==================== PROVEEDORES ====================

  async getProveedor(uid: string): Promise<ProveedorUser | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    if (data.userType !== 'Proveedor') {
      return null;
    }

    return {
      ...data,
      uid: docSnap.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as ProveedorUser;
  }

  async updateProveedor(uid: string, data: Partial<ProveedorUser>): Promise<void> {
    const docRef = doc(db, 'users', uid);
    const updateData = {
      ...data,
      updatedAt: Timestamp.now(),
    };
    await updateDoc(docRef, updateData);
  }

  async getProveedores(filters?: ProveedorFilters): Promise<ProveedorUser[]> {
    let q = query(
      collection(db, 'users'),
      where('userType', '==', 'Proveedor')
    );

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        q = query(q, where('status', 'in', filters.status));
      } else {
        q = query(q, where('status', '==', filters.status));
      }
    }

    if (filters?.empresa) {
      q = query(q, where('empresa', '==', filters.empresa));
    }

    if (filters?.documentosValidados !== undefined) {
      q = query(q, where('documentosValidados', '==', filters.documentosValidados));
    }

    const snapshot = await getDocs(q);
    let proveedores = snapshot.docs.map((doc) => ({
      ...doc.data(),
      uid: doc.id,
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: doc.data().updatedAt ? timestampToDate(doc.data().updatedAt) : undefined,
    })) as ProveedorUser[];

    // Filtro de búsqueda en memoria (más flexible)
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      proveedores = proveedores.filter(
        (p) =>
          p.razonSocial.toLowerCase().includes(term) ||
          p.rfc.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term)
      );
    }

    return proveedores;
  }

  async updateProveedorStatus(uid: string, status: ProveedorUser['status']): Promise<void> {
    await this.updateProveedor(uid, { status });
  }

  // ==================== DOCUMENTOS DE PROVEEDORES ====================

  async createDocumento(data: Omit<DocumentoProveedor, 'id'>): Promise<string> {
    const docData = {
      ...data,
      uploadedAt: dateToTimestamp(data.uploadedAt as Date),
      updatedAt: data.updatedAt ? dateToTimestamp(data.updatedAt as Date) : undefined,
      fechaRevision: data.fechaRevision
        ? dateToTimestamp(data.fechaRevision as Date)
        : undefined,
    };

    const docRef = await addDoc(collection(db, 'proveedores_documentacion'), docData);
    return docRef.id;
  }

  async getDocumentosByProveedor(proveedorId: string): Promise<DocumentoProveedor[]> {
    const q = query(
      collection(db, 'proveedores_documentacion'),
      where('proveedorId', '==', proveedorId),
      orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      uploadedAt: timestampToDate(doc.data().uploadedAt),
      updatedAt: doc.data().updatedAt ? timestampToDate(doc.data().updatedAt) : undefined,
      fechaRevision: doc.data().fechaRevision
        ? timestampToDate(doc.data().fechaRevision)
        : undefined,
    })) as DocumentoProveedor[];
  }

  async updateDocumento(id: string, data: Partial<DocumentoProveedor>): Promise<void> {
    const docRef = doc(db, 'proveedores_documentacion', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    if (data.fechaRevision) {
      updateData.fechaRevision = dateToTimestamp(data.fechaRevision as Date);
    }

    await updateDoc(docRef, updateData);
  }

  async deleteDocumento(id: string): Promise<void> {
    const docRef = doc(db, 'proveedores_documentacion', id);
    await deleteDoc(docRef);
  }

  // ==================== ÓRDENES DE COMPRA ====================

  async createOrdenCompra(data: Omit<OrdenCompra, 'id'>): Promise<string> {
    const docData = {
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      fechaEntrega: dateToTimestamp(data.fechaEntrega as Date),
      ultimaSincronizacion: dateToTimestamp(data.ultimaSincronizacion as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
    };

    const docRef = await addDoc(collection(db, 'ordenes_compra'), docData);
    return docRef.id;
  }

  async getOrdenCompra(id: string): Promise<OrdenCompra | null> {
    const docRef = doc(db, 'ordenes_compra', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      fecha: timestampToDate(data.fecha),
      fechaEntrega: timestampToDate(data.fechaEntrega),
      ultimaSincronizacion: timestampToDate(data.ultimaSincronizacion),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as OrdenCompra;
  }

  async getOrdenesCompraByProveedor(
    proveedorId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({ proveedorId }, filters);
  }

  async getOrdenesCompraByEmpresa(
    empresaId: string,
    filters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({ empresaId }, filters);
  }

  async getAllOrdenesCompra(filters?: OrdenCompraFilters): Promise<OrdenCompra[]> {
    return this.getOrdenesCompraWithFilters({}, filters);
  }

  private async getOrdenesCompraWithFilters(
    baseFilters: { proveedorId?: string; empresaId?: string },
    additionalFilters?: OrdenCompraFilters
  ): Promise<OrdenCompra[]> {
    let q = query(collection(db, 'ordenes_compra'));

    if (baseFilters.proveedorId) {
      q = query(q, where('proveedorId', '==', baseFilters.proveedorId));
    }

    if (baseFilters.empresaId) {
      q = query(q, where('empresaId', '==', baseFilters.empresaId));
    }

    if (additionalFilters?.status) {
      if (Array.isArray(additionalFilters.status)) {
        q = query(q, where('status', 'in', additionalFilters.status));
      } else {
        q = query(q, where('status', '==', additionalFilters.status));
      }
    }

    if (additionalFilters?.facturada !== undefined) {
      q = query(q, where('facturada', '==', additionalFilters.facturada));
    }

    q = query(q, orderBy('fecha', 'desc'));

    const snapshot = await getDocs(q);
    let ordenes = snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      fecha: timestampToDate(doc.data().fecha),
      fechaEntrega: timestampToDate(doc.data().fechaEntrega),
      ultimaSincronizacion: timestampToDate(doc.data().ultimaSincronizacion),
      createdAt: timestampToDate(doc.data().createdAt),
      updatedAt: timestampToDate(doc.data().updatedAt),
    })) as OrdenCompra[];

    // Filtros de fecha en memoria
    if (additionalFilters?.fechaDesde) {
      ordenes = ordenes.filter((o) => o.fecha >= additionalFilters.fechaDesde!);
    }

    if (additionalFilters?.fechaHasta) {
      ordenes = ordenes.filter((o) => o.fecha <= additionalFilters.fechaHasta!);
    }

    // Búsqueda en memoria
    if (additionalFilters?.searchTerm) {
      const term = additionalFilters.searchTerm.toLowerCase();
      ordenes = ordenes.filter(
        (o) =>
          o.folio.toLowerCase().includes(term) ||
          o.ordenId.toLowerCase().includes(term) ||
          o.proveedorRazonSocial.toLowerCase().includes(term)
      );
    }

    return ordenes;
  }

  async updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<void> {
    const docRef = doc(db, 'ordenes_compra', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    if (data.fecha) updateData.fecha = dateToTimestamp(data.fecha as Date);
    if (data.fechaEntrega)
      updateData.fechaEntrega = dateToTimestamp(data.fechaEntrega as Date);

    await updateDoc(docRef, updateData);
  }

  // ==================== FACTURAS ====================

  async createFactura(data: Omit<Factura, 'id'>): Promise<string> {
    const docData = {
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
      fechaValidacionSAT: data.fechaValidacionSAT
        ? dateToTimestamp(data.fechaValidacionSAT as Date)
        : undefined,
      fechaPago: data.fechaPago ? dateToTimestamp(data.fechaPago as Date) : undefined,
      fechaRevision: data.fechaRevision
        ? dateToTimestamp(data.fechaRevision as Date)
        : undefined,
      ultimaSincronizacion: data.ultimaSincronizacion
        ? dateToTimestamp(data.ultimaSincronizacion as Date)
        : undefined,
    };

    const docRef = await addDoc(collection(db, 'facturas'), docData);
    return docRef.id;
  }

  async getFactura(id: string): Promise<Factura | null> {
    const docRef = doc(db, 'facturas', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return this.mapFactura(docSnap.id, docSnap.data());
  }

  async getFacturasByProveedor(
    proveedorId: string,
    filters?: FacturaFilters
  ): Promise<Factura[]> {
    return this.getFacturasWithFilters({ proveedorId }, filters);
  }

  async getFacturasByEmpresa(empresaId: string, filters?: FacturaFilters): Promise<Factura[]> {
    return this.getFacturasWithFilters({ empresaId }, filters);
  }

  async getAllFacturas(filters?: FacturaFilters): Promise<Factura[]> {
    return this.getFacturasWithFilters({}, filters);
  }

  private async getFacturasWithFilters(
    baseFilters: { proveedorId?: string; empresaId?: string },
    additionalFilters?: FacturaFilters
  ): Promise<Factura[]> {
    let q = query(collection(db, 'facturas'));

    if (baseFilters.proveedorId) {
      q = query(q, where('proveedorId', '==', baseFilters.proveedorId));
    }

    if (baseFilters.empresaId) {
      q = query(q, where('empresaId', '==', baseFilters.empresaId));
    }

    if (additionalFilters?.status) {
      if (Array.isArray(additionalFilters.status)) {
        q = query(q, where('status', 'in', additionalFilters.status));
      } else {
        q = query(q, where('status', '==', additionalFilters.status));
      }
    }

    if (additionalFilters?.pagada !== undefined) {
      q = query(q, where('pagada', '==', additionalFilters.pagada));
    }

    if (additionalFilters?.validadaSAT !== undefined) {
      q = query(q, where('validadaSAT', '==', additionalFilters.validadaSAT));
    }

    q = query(q, orderBy('fecha', 'desc'));

    const snapshot = await getDocs(q);
    let facturas = snapshot.docs.map((doc) => this.mapFactura(doc.id, doc.data()));

    // Filtros de fecha en memoria
    if (additionalFilters?.fechaDesde) {
      facturas = facturas.filter((f) => f.fecha >= additionalFilters.fechaDesde!);
    }

    if (additionalFilters?.fechaHasta) {
      facturas = facturas.filter((f) => f.fecha <= additionalFilters.fechaHasta!);
    }

    // Búsqueda en memoria
    if (additionalFilters?.searchTerm) {
      const term = additionalFilters.searchTerm.toLowerCase();
      facturas = facturas.filter(
        (f) =>
          f.folio.toLowerCase().includes(term) ||
          f.uuid.toLowerCase().includes(term) ||
          f.proveedorRazonSocial.toLowerCase().includes(term)
      );
    }

    return facturas;
  }

  async updateFactura(id: string, data: Partial<Factura>): Promise<void> {
    const docRef = doc(db, 'facturas', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    if (data.fecha) updateData.fecha = dateToTimestamp(data.fecha as Date);
    if (data.fechaValidacionSAT)
      updateData.fechaValidacionSAT = dateToTimestamp(data.fechaValidacionSAT as Date);
    if (data.fechaPago) updateData.fechaPago = dateToTimestamp(data.fechaPago as Date);
    if (data.fechaRevision)
      updateData.fechaRevision = dateToTimestamp(data.fechaRevision as Date);

    await updateDoc(docRef, updateData);
  }

  async getFacturaByUUID(uuid: string): Promise<Factura | null> {
    const q = query(collection(db, 'facturas'), where('uuid', '==', uuid), firestoreLimit(1));

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapFactura(doc.id, doc.data());
  }

  private mapFactura(id: string, data: any): Factura {
    return {
      ...data,
      id,
      fecha: timestampToDate(data.fecha),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      fechaValidacionSAT: data.fechaValidacionSAT
        ? timestampToDate(data.fechaValidacionSAT)
        : undefined,
      fechaPago: data.fechaPago ? timestampToDate(data.fechaPago) : undefined,
      fechaRevision: data.fechaRevision ? timestampToDate(data.fechaRevision) : undefined,
      ultimaSincronizacion: data.ultimaSincronizacion
        ? timestampToDate(data.ultimaSincronizacion)
        : undefined,
    } as Factura;
  }

  // ==================== COMPLEMENTOS DE PAGO ====================

  async createComplementoPago(data: Omit<ComplementoPago, 'id'>): Promise<string> {
    const docData = {
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
      ultimaSincronizacion: data.ultimaSincronizacion
        ? dateToTimestamp(data.ultimaSincronizacion as Date)
        : undefined,
    };

    const docRef = await addDoc(collection(db, 'complementos_pago'), docData);
    return docRef.id;
  }

  async getComplementosPagoByProveedor(proveedorId: string): Promise<ComplementoPago[]> {
    const q = query(
      collection(db, 'complementos_pago'),
      where('proveedorId', '==', proveedorId),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapComplementoPago(doc.id, doc.data()));
  }

  async getComplementosPagoByEmpresa(empresaId: string): Promise<ComplementoPago[]> {
    const q = query(
      collection(db, 'complementos_pago'),
      where('empresaId', '==', empresaId),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapComplementoPago(doc.id, doc.data()));
  }

  async updateComplementoPago(id: string, data: Partial<ComplementoPago>): Promise<void> {
    const docRef = doc(db, 'complementos_pago', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    if (data.fecha) updateData.fecha = dateToTimestamp(data.fecha as Date);

    await updateDoc(docRef, updateData);
  }

  private mapComplementoPago(id: string, data: any): ComplementoPago {
    return {
      ...data,
      id,
      fecha: timestampToDate(data.fecha),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
      ultimaSincronizacion: data.ultimaSincronizacion
        ? timestampToDate(data.ultimaSincronizacion)
        : undefined,
    } as ComplementoPago;
  }

  // ==================== COMPROBANTES DE PAGO ====================

  async createComprobantePago(data: Omit<ComprobantePago, 'id'>): Promise<string> {
    const docData = {
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
    };

    const docRef = await addDoc(collection(db, 'comprobantes_pago'), docData);
    return docRef.id;
  }

  async getComprobantesPagoByProveedor(proveedorId: string): Promise<ComprobantePago[]> {
    const q = query(
      collection(db, 'comprobantes_pago'),
      where('proveedorId', '==', proveedorId),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapComprobantePago(doc.id, doc.data()));
  }

  async getComprobantesPagoByEmpresa(empresaId: string): Promise<ComprobantePago[]> {
    const q = query(
      collection(db, 'comprobantes_pago'),
      where('empresaId', '==', empresaId),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => this.mapComprobantePago(doc.id, doc.data()));
  }

  async updateComprobantePago(id: string, data: Partial<ComprobantePago>): Promise<void> {
    const docRef = doc(db, 'comprobantes_pago', id);
    await updateDoc(docRef, data);
  }

  private mapComprobantePago(id: string, data: any): ComprobantePago {
    return {
      ...data,
      id,
      fecha: timestampToDate(data.fecha),
      createdAt: timestampToDate(data.createdAt),
    } as ComprobantePago;
  }

  // ==================== MENSAJERÍA ====================

  async createConversacion(data: Omit<Conversacion, 'id'>): Promise<string> {
    const docData = {
      ...data,
      ultimoMensajeFecha: dateToTimestamp(data.ultimoMensajeFecha as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
    };

    const docRef = await addDoc(collection(db, 'conversaciones'), docData);
    return docRef.id;
  }

  async getConversacion(id: string): Promise<Conversacion | null> {
    const docRef = doc(db, 'conversaciones', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      ultimoMensajeFecha: timestampToDate(data.ultimoMensajeFecha),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Conversacion;
  }

  async getConversacionesByUsuario(usuarioId: string): Promise<Conversacion[]> {
    const q = query(
      collection(db, 'conversaciones'),
      where('participantes', 'array-contains', usuarioId),
      where('activa', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        ultimoMensajeFecha: timestampToDate(data.ultimoMensajeFecha),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Conversacion;
    });
  }

  async updateConversacion(id: string, data: Partial<Conversacion>): Promise<void> {
    const docRef = doc(db, 'conversaciones', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    if (data.ultimoMensajeFecha)
      updateData.ultimoMensajeFecha = dateToTimestamp(data.ultimoMensajeFecha as Date);

    await updateDoc(docRef, updateData);
  }

  async createMensaje(data: Omit<Mensaje, 'id'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: dateToTimestamp(data.createdAt as Date),
      fechaLectura: data.fechaLectura ? dateToTimestamp(data.fechaLectura as Date) : undefined,
    };

    const docRef = await addDoc(collection(db, 'mensajes'), docData);
    return docRef.id;
  }

  async getMensajesByConversacion(
    conversacionId: string,
    limit: number = 50
  ): Promise<Mensaje[]> {
    const q = query(
      collection(db, 'mensajes'),
      where('conversacionId', '==', conversacionId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        fechaLectura: data.fechaLectura ? timestampToDate(data.fechaLectura) : undefined,
      } as Mensaje;
    });
  }

  async marcarMensajeComoLeido(id: string): Promise<void> {
    const docRef = doc(db, 'mensajes', id);
    await updateDoc(docRef, {
      leido: true,
      fechaLectura: Timestamp.now(),
    });
  }

  // ==================== NOTIFICACIONES ====================

  async createNotificacion(data: Omit<Notificacion, 'id'>): Promise<string> {
    const docData = {
      ...data,
      createdAt: dateToTimestamp(data.createdAt as Date),
      fechaLectura: data.fechaLectura ? dateToTimestamp(data.fechaLectura as Date) : undefined,
      fechaEnvioEmail: data.fechaEnvioEmail
        ? dateToTimestamp(data.fechaEnvioEmail as Date)
        : undefined,
    };

    const docRef = await addDoc(collection(db, 'notificaciones'), docData);
    return docRef.id;
  }

  async getNotificacionesByUsuario(
    usuarioId: string,
    limit: number = 50
  ): Promise<Notificacion[]> {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        fechaLectura: data.fechaLectura ? timestampToDate(data.fechaLectura) : undefined,
        fechaEnvioEmail: data.fechaEnvioEmail
          ? timestampToDate(data.fechaEnvioEmail)
          : undefined,
      } as Notificacion;
    });
  }

  async marcarNotificacionComoLeida(id: string): Promise<void> {
    const docRef = doc(db, 'notificaciones', id);
    await updateDoc(docRef, {
      leida: true,
      fechaLectura: Timestamp.now(),
    });
  }

  async marcarTodasNotificacionesComoLeidas(usuarioId: string): Promise<void> {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId),
      where('leida', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, {
        leida: true,
        fechaLectura: Timestamp.now(),
      })
    );

    await Promise.all(updatePromises);
  }

  async getNotificacionesNoLeidas(usuarioId: string): Promise<number> {
    const q = query(
      collection(db, 'notificaciones'),
      where('usuarioId', '==', usuarioId),
      where('leida', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}