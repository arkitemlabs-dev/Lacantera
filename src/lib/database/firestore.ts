// Archivo completo actualizado con manejo correcto de undefined
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
  serverTimestamp,
} from 'firebase/firestore';

import type {
  Database,
  ProveedorFilters,
  OrdenCompraFilters,
  FacturaFilters,
  Empresa,
  UsuarioEmpresa,
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
} from '@/types/backend';

// Helper: Convertir Timestamp a Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// Helper: Convertir Date a Timestamp
const dateToTimestamp = (date: Date | Timestamp): Timestamp => {
  if (date instanceof Timestamp) {
    return date;
  }
  return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
};

// Helper: Limpiar undefined values
const cleanUndefined = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

export class FirestoreDatabase implements Database {
  // PROVEEDORES
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
    const updateData = cleanUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    });
    await updateDoc(docRef, updateData);
  }

  async getProveedores(filters?: ProveedorFilters): Promise<ProveedorUser[]> {
    let q = query(collection(db, 'users'), where('userType', '==', 'Proveedor'));

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

  // DOCUMENTOS
  async createDocumento(data: Omit<DocumentoProveedor, 'id'>): Promise<string> {
    const docData = cleanUndefined({
      ...data,
      uploadedAt: dateToTimestamp(data.uploadedAt as Date),
      updatedAt: data.updatedAt ? dateToTimestamp(data.updatedAt as Date) : null,
      fechaRevision: data.fechaRevision ? dateToTimestamp(data.fechaRevision as Date) : null,
    });

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
      fechaRevision: doc.data().fechaRevision ? timestampToDate(doc.data().fechaRevision) : undefined,
    })) as DocumentoProveedor[];
  }

  async updateDocumento(id: string, data: Partial<DocumentoProveedor>): Promise<void> {
    const docRef = doc(db, 'proveedores_documentacion', id);
    const updateData: any = cleanUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (data.fechaRevision) {
      updateData.fechaRevision = dateToTimestamp(data.fechaRevision as Date);
    }

    await updateDoc(docRef, updateData);
  }

  async deleteDocumento(id: string): Promise<void> {
    const docRef = doc(db, 'proveedores_documentacion', id);
    await deleteDoc(docRef);
  }

  // ÓRDENES DE COMPRA
  async createOrdenCompra(data: Omit<OrdenCompra, 'id'>): Promise<string> {
    const docData = cleanUndefined({
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      fechaEntrega: dateToTimestamp(data.fechaEntrega as Date),
      ultimaSincronizacion: dateToTimestamp(data.ultimaSincronizacion as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
    });

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

    if (additionalFilters?.fechaDesde) {
      ordenes = ordenes.filter((o) => o.fecha >= additionalFilters.fechaDesde!);
    }

    if (additionalFilters?.fechaHasta) {
      ordenes = ordenes.filter((o) => o.fecha <= additionalFilters.fechaHasta!);
    }

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
    const updateData: any = cleanUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (data.fecha) updateData.fecha = dateToTimestamp(data.fecha as Date);
    if (data.fechaEntrega) updateData.fechaEntrega = dateToTimestamp(data.fechaEntrega as Date);

    await updateDoc(docRef, updateData);
  }

  // FACTURAS
  async createFactura(data: Omit<Factura, 'id'>): Promise<string> {
    const docData = cleanUndefined({
      ...data,
      fecha: dateToTimestamp(data.fecha as Date),
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: dateToTimestamp(data.updatedAt as Date),
      fechaValidacionSAT: data.fechaValidacionSAT
        ? dateToTimestamp(data.fechaValidacionSAT as Date)
        : null,
      fechaPago: data.fechaPago ? dateToTimestamp(data.fechaPago as Date) : null,
      fechaRevision: data.fechaRevision ? dateToTimestamp(data.fechaRevision as Date) : null,
      ultimaSincronizacion: data.ultimaSincronizacion
        ? dateToTimestamp(data.ultimaSincronizacion as Date)
        : null,
    });

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

    if (additionalFilters?.fechaDesde) {
      facturas = facturas.filter((f) => f.fecha >= additionalFilters.fechaDesde!);
    }

    if (additionalFilters?.fechaHasta) {
      facturas = facturas.filter((f) => f.fecha <= additionalFilters.fechaHasta!);
    }

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
    const updateData: any = cleanUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    });

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

  // ==================== EMPRESAS ====================
  async createEmpresa(data: Omit<Empresa, 'id'>): Promise<string> {
    const empresaData = cleanUndefined({
      ...data,
      activa: data.activa ?? true,
      createdAt: dateToTimestamp(data.createdAt as Date),
      updatedAt: data.updatedAt ? dateToTimestamp(data.updatedAt as Date) : null,
    });

    const docRef = await addDoc(collection(db, 'empresas'), empresaData);
    return docRef.id;
  }

  async getEmpresa(id: string): Promise<Empresa | null> {
    const docRef = doc(db, 'empresas', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as Empresa;
  }

  async getEmpresaByCodigo(codigo: string): Promise<Empresa | null> {
    const q = query(
      collection(db, 'empresas'),
      where('codigo', '==', codigo),
      firestoreLimit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: timestampToDate(data.createdAt),
      updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
    } as Empresa;
  }

  async getEmpresas(filters?: { activa?: boolean }): Promise<Empresa[]> {
    let q = query(collection(db, 'empresas'));

    if (filters?.activa !== undefined) {
      q = query(q, where('activa', '==', filters.activa));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
      } as Empresa;
    });
  }

  async updateEmpresa(id: string, data: Partial<Empresa>): Promise<void> {
    const docRef = doc(db, 'empresas', id);
    const updateData = cleanUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    });

    if (data.createdAt) {
      updateData.createdAt = dateToTimestamp(data.createdAt as Date);
    }

    await updateDoc(docRef, updateData);
  }

  // ==================== USUARIO-EMPRESA ====================
  async createUsuarioEmpresa(data: Omit<UsuarioEmpresa, 'id'>): Promise<string> {
    const relacionData = cleanUndefined({
      ...data,
      activo: data.activo ?? true,
      createdAt: dateToTimestamp(data.createdAt as Date),
    });

    const docRef = await addDoc(collection(db, 'usuarios_empresas'), relacionData);
    return docRef.id;
  }

  async getEmpresasByUsuario(usuarioId: string): Promise<UsuarioEmpresa[]> {
    const q = query(
      collection(db, 'usuarios_empresas'),
      where('usuarioId', '==', usuarioId),
      where('activo', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: timestampToDate(data.createdAt),
      } as UsuarioEmpresa;
    });
  }

  async updateUsuarioEmpresa(
    usuarioId: string, 
    empresaId: string, 
    data: Partial<UsuarioEmpresa>
  ): Promise<void> {
    // Buscar la relación existente
    const q = query(
      collection(db, 'usuarios_empresas'),
      where('usuarioId', '==', usuarioId),
      where('empresaId', '==', empresaId),
      firestoreLimit(1)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = doc(db, 'usuarios_empresas', snapshot.docs[0].id);
      const updateData = cleanUndefined(data);
      await updateDoc(docRef, updateData);
    }
  }

  // Métodos restantes (stubs para evitar errores)
  async createComplementoPago(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getComplementosPagoByProveedor(): Promise<ComplementoPago[]> {
    return [];
  }
  async getComplementosPagoByEmpresa(): Promise<ComplementoPago[]> {
    return [];
  }
  async updateComplementoPago(): Promise<void> {}

  async createComprobantePago(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getComprobantesPagoByProveedor(): Promise<ComprobantePago[]> {
    return [];
  }
  async getComprobantesPagoByEmpresa(): Promise<ComprobantePago[]> {
    return [];
  }
  async updateComprobantePago(): Promise<void> {}

  async createConversacion(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getConversacion(): Promise<Conversacion | null> {
    return null;
  }
  async getConversacionesByUsuario(): Promise<Conversacion[]> {
    return [];
  }
  async updateConversacion(): Promise<void> {}

  async createMensaje(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getMensajesByConversacion(): Promise<Mensaje[]> {
    return [];
  }
  async marcarMensajeComoLeido(): Promise<void> {}

  async createNotificacion(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getNotificacionesByUsuario(): Promise<Notificacion[]> {
    return [];
  }
  async marcarNotificacionComoLeida(): Promise<void> {}
  async marcarTodasNotificacionesComoLeidas(): Promise<void> {}
  async getNotificacionesNoLeidas(): Promise<number> {
    return 0;
  }
}