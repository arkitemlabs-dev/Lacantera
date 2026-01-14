/**
 * Stored Procedures - Conexión a Intelisis
 *
 * Este módulo centraliza todas las llamadas a stored procedures
 * del ERP Intelisis (Base de datos Cantera)
 */

import sql from 'mssql';
import { getERPConnection } from './multi-tenant-connection';

// =============================================================================
// MAPEO DE CÓDIGOS DE EMPRESA A TENANT IDs
// =============================================================================

/**
 * Mapeo de códigos de empresa (usados en el ERP) a tenant IDs (usados en el portal)
 *
 * Códigos ERP: '01', '02', '03', '04', '05'
 * Tenant IDs: 'la-cantera', 'peralillo', 'plaza-galerena', etc.
 */
const EMPRESA_TO_TENANT: Record<string, string> = {
  '01': 'la-cantera',
  '02': 'peralillo',
  '03': 'plaza-galerena',
  '04': 'inmobiliaria-galerena',
  '05': 'icrear',
  // También permitir usar el tenant ID directamente
  'la-cantera': 'la-cantera',
  'peralillo': 'peralillo',
  'plaza-galerena': 'plaza-galerena',
  'inmobiliaria-galerena': 'inmobiliaria-galerena',
  'icrear': 'icrear',
};

/**
 * Convierte un código de empresa a tenant ID
 */
function empresaToTenant(empresaCode: string): string {
  const tenantId = EMPRESA_TO_TENANT[empresaCode];
  if (!tenantId) {
    throw new Error(`Código de empresa no reconocido: ${empresaCode}. Valores válidos: ${Object.keys(EMPRESA_TO_TENANT).join(', ')}`);
  }
  return tenantId;
}

// =============================================================================
// TIPOS
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeParams {
  fechaDesde?: Date | string | null;
  fechaHasta?: Date | string | null;
}

// -----------------------------------------------------------------------------
// Órdenes de Compra
// -----------------------------------------------------------------------------

export interface GetOrdenesCompraParams extends PaginationParams, DateRangeParams {
  proveedor?: string | null;
  rfc?: string | null;
  empresa?: string | null;
  estatus?: 'PENDIENTE' | 'CONCLUIDO' | 'CANCELADO' | 'todas' | null;
}

export interface OrdenCompra {
  ID: number;
  Empresa: string;
  Mov: string;
  MovID: string;
  FechaEmision: Date;
  Proveedor: string;
  ProveedorNombre: string;
  ProveedorRFC: string;
  Moneda: string;
  TipoCambio: number;
  Importe: number;
  Impuestos: number;
  Saldo: number;
  Estatus: string;
  Situacion: string;
  FechaRequerida: Date;
  Observaciones: string;
}

export interface GetOrdenesCompraResult {
  ordenes: OrdenCompra[];
  total: number;
}

// -----------------------------------------------------------------------------
// Facturas
// -----------------------------------------------------------------------------

export interface GetFacturasParams extends PaginationParams, DateRangeParams {
  proveedor?: string | null;
  rfc?: string | null;
  empresa?: string | null;
  estatus?: 'EN_REVISION' | 'APROBADA' | 'PAGADA' | 'RECHAZADA' | 'todas' | null;
  numeroFactura?: string | null;
}

export interface Factura {
  ID: number;
  Empresa: string;
  Folio: string;
  Serie: string;
  UUID: string;
  FechaEmision: Date;
  ProveedorNombre: string;
  ProveedorRFC: string;
  Total: number;
  Saldo: number;
  Estatus: string;
  OrdenCompraMovID: string;
  UrlPDF: string;
  UrlXML: string;
}

export interface GetFacturasResult {
  facturas: Factura[];
  total: number;
}

// =============================================================================
// HELPER PARA EXTRAER RECORDSETS
// =============================================================================

/**
 * Extrae un recordset de forma segura del resultado de un SP
 */
function getRecordset<T = unknown>(result: sql.IProcedureResult<T>, index: number): T[] {
  const recordsets = result.recordsets as unknown as T[][];
  return recordsets[index] || [];
}

/**
 * Extrae el primer registro de un recordset de forma segura
 */
function getFirstRecord<T = unknown>(result: sql.IProcedureResult<T>, index: number): T | null {
  const recordset = getRecordset<T>(result, index);
  return recordset[0] || null;
}

// =============================================================================
// CLASE PRINCIPAL
// =============================================================================

export class StoredProcedures {

  /**
   * Obtiene la conexión al ERP según el código de empresa
   * Convierte automáticamente códigos como '01' a tenant IDs como 'la-cantera'
   */
  private async getPool(empresaCode: string = '01'): Promise<sql.ConnectionPool> {
    const tenantId = empresaToTenant(empresaCode);
    return await getERPConnection(tenantId);
  }

  /**
   * Helper para convertir fechas a objeto Date
   * Maneja strings en formato 'YYYY-MM-DD' correctamente para SQL Server
   */
  private toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Si es string en formato 'YYYY-MM-DD', parsearlo correctamente
    // para evitar problemas de zona horaria
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(value);
  }

  /**
   * Helper para convertir fechas a string formato YYYY-MM-DD
   * SQL Server acepta este formato directamente como VARCHAR
   */
  private toDateString(value: Date | string | null | undefined): string | null {
    if (!value) return null;

    // Si ya es string en formato correcto, devolverlo
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Si es Date, convertir a string
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Intentar parsear como fecha y convertir
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  // ===========================================================================
  // ÓRDENES DE COMPRA
  // ===========================================================================

  /**
   * SP 1: sp_GetOrdenesCompra
   * Lista órdenes de compra con paginación y filtros (Vista Admin)
   *
   * Parámetros reales del SP:
   * @RfcProv VARCHAR(20), @Empresa VARCHAR(5), @Estatus VARCHAR(15),
   * @FechaDesde DATE, @FechaHasta DATE, @Page INT, @Limit INT, @CuantasPaginas INT
   */
  async getOrdenesCompra(params: GetOrdenesCompraParams = {}): Promise<GetOrdenesCompraResult> {
    const {
      rfc = null,
      empresa = '01',
      estatus = null,
      fechaDesde = null,
      fechaHasta = null,
      page = 1,
      limit = 50
    } = params;

    const pool = await this.getPool(empresa || '01');

    // Calcular cantidad de páginas para que el SP devuelve el total
    // Si pasamos 1, el SP debería calcular y devolver el total
    const cuantasPaginas = 1;

    // Convertir fechas - el SP espera formato DD-MM-YYYY
    // Entrada: '2025-10-01' (YYYY-MM-DD) → Salida: '01-10-2025' (DD-MM-YYYY)
    const convertirFecha = (fecha: string | null): string | null => {
      if (!fecha) return null;
      const partes = fecha.split('-'); // ['2025', '10', '01']
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1]}-${partes[0]}`; // '01-10-2025'
      }
      return fecha;
    };
    const fechaDesdeStr = convertirFecha(fechaDesde as string);
    const fechaHastaStr = convertirFecha(fechaHasta as string);

    const result = await pool.request()
      .input('Rfc', sql.VarChar(20), rfc)
      .input('Empresa', sql.VarChar(5), empresa)
      .input('Estatus', sql.VarChar(15), estatus)
      .input('FechaDesde', sql.VarChar(10), fechaDesdeStr)
      .input('FechaHasta', sql.VarChar(10), fechaHastaStr)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .input('CuantasPaginas', sql.Int, cuantasPaginas)
      .execute('sp_GetOrdenesCompra');

    const ordenes = getRecordset<OrdenCompra>(result, 0);
    const paginacionRecord = getFirstRecord<{ Paginas: number; Registros: number; Total: number }>(result, 1);

    return {
      ordenes,
      // Intentar con Registros (nombre del SP) o Total como fallback
      total: paginacionRecord?.Registros || paginacionRecord?.Total || 0
    };
  }

  /**
   * SP 2: sp_GetOrdenCompraPorID
   * Obtiene detalle de una orden específica
   */
  async getOrdenCompraPorID(id: number, empresa?: string): Promise<{ orden: OrdenCompra | null; partidas: unknown[] }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_GetOrdenCompraPorID');

    return {
      orden: getFirstRecord<OrdenCompra>(result, 0),
      partidas: getRecordset(result, 1)
    };
  }

  /**
   * SP 3: sp_GetOrdenesCompraStats
   * Estadísticas para dashboard de órdenes
   */
  async getOrdenesCompraStats(empresa?: string, estatus?: string): Promise<{
    totales: unknown;
    topProveedores: unknown[];
    porMes: unknown[];
    porEstatus: unknown[];
  }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('Estatus', sql.VarChar(20), estatus || null)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_GetOrdenesCompraStats');

    return {
      totales: getFirstRecord(result, 0) || {},
      topProveedores: getRecordset(result, 1),
      porMes: getRecordset(result, 2),
      porEstatus: getRecordset(result, 3)
    };
  }

  /**
   * SP 4: sp_GetOrdenesCompraProveedor
   * Órdenes de un proveedor específico (Vista Proveedor)
   */
  async getOrdenesCompraProveedor(
    rfc: string,
    empresa: string,
    params: Omit<GetOrdenesCompraParams, 'rfc' | 'empresa' | 'proveedor'> = {}
  ): Promise<GetOrdenesCompraResult> {
    const {
      estatus = null,
      fechaDesde = null,
      fechaHasta = null,
      page = 1,
      limit = 50
    } = params;

    const pool = await this.getPool(empresa);

    // Convertir fechas - el SP espera formato DD-MM-YYYY (igual que el SP de admin)
    const convertirFecha = (fecha: string | null): string | null => {
      if (!fecha) return null;
      const partes = fecha.split('-'); // ['2025', '10', '01']
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1]}-${partes[0]}`; // '01-10-2025'
      }
      return fecha;
    };
    const fechaDesdeStr = convertirFecha(fechaDesde as string);
    const fechaHastaStr = convertirFecha(fechaHasta as string);

    // Log para debug
    console.log('[SP getOrdenesCompraProveedor] Parámetros:', {
      rfc,
      empresa,
      estatus,
      fechaDesdeOriginal: fechaDesde,
      fechaHastaOriginal: fechaHasta,
      fechaDesdeStr,
      fechaHastaStr,
      page,
      limit
    });

    const result = await pool.request()
      .input('RFC', sql.VarChar(13), rfc)
      .input('Empresa', sql.VarChar(10), empresa)
      .input('Estatus', sql.VarChar(20), estatus)
      .input('FechaDesde', sql.VarChar(10), fechaDesdeStr)
      .input('FechaHasta', sql.VarChar(10), fechaHastaStr)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .execute('sp_GetOrdenesCompraProveedor');

    const ordenes = getRecordset<OrdenCompra>(result, 0);
    const totalRecord = getFirstRecord<{ Total: number }>(result, 1);

    // Log resultado
    console.log('[SP getOrdenesCompraProveedor] Resultado:', {
      ordenesCount: ordenes.length,
      total: totalRecord?.Total || 0,
      primeraOrden: ordenes[0] ? {
        ID: ordenes[0].ID,
        MovID: ordenes[0].MovID,
        FechaEmision: ordenes[0].FechaEmision,
        Proveedor: ordenes[0].Proveedor
      } : null
    });

    return {
      ordenes,
      total: totalRecord?.Total || 0
    };
  }

  /**
   * SP 5: sp_GetOrdenCompraConDetalle
   * Orden con partidas (2 result sets)
   */
  async getOrdenCompraConDetalle(ordenId: number, empresa?: string): Promise<{
    encabezado: unknown | null;
    partidas: unknown[];
  }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('OrdenID', sql.Int, ordenId)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_GetOrdenCompraConDetalle');

    return {
      encabezado: getFirstRecord(result, 0),
      partidas: getRecordset(result, 1)
    };
  }

  /**
   * SP 6: sp_GetPartidasOrdenCompra
   * Solo partidas de una orden
   */
  async getPartidasOrdenCompra(ordenId: number, empresa?: string): Promise<unknown[]> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('OrdenID', sql.Int, ordenId)
      .execute('sp_GetPartidasOrdenCompra');

    return result.recordset || [];
  }

  // ===========================================================================
  // FACTURAS
  // ===========================================================================

  /**
   * SP 1: sp_GetFacturas
   * Lista facturas con paginación y filtros (Vista Admin)
   */
  async getFacturas(params: GetFacturasParams = {}): Promise<GetFacturasResult> {
    const {
      proveedor = null,
      rfc = null,
      empresa = '01',
      estatus = null,
      fechaDesde = null,
      fechaHasta = null,
      numeroFactura = null,
      page = 1,
      limit = 10
    } = params;

    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('Proveedor', sql.VarChar(20), proveedor)
      .input('RFC', sql.VarChar(13), rfc)
      .input('Empresa', sql.VarChar(10), empresa)
      .input('Estatus', sql.VarChar(20), estatus)
      .input('FechaDesde', sql.Date, this.toDate(fechaDesde))
      .input('FechaHasta', sql.Date, this.toDate(fechaHasta))
      .input('NumeroFactura', sql.VarChar(50), numeroFactura)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .execute('sp_GetFacturas');

    const facturas = getRecordset<Factura>(result, 0);
    const totalRecord = getFirstRecord<{ Total: number }>(result, 1);

    return {
      facturas,
      total: totalRecord?.Total || 0
    };
  }

  /**
   * SP 2: sp_GetFacturaPorID
   * Detalle completo de una factura
   */
  async getFacturaPorID(id: number, empresa?: string): Promise<{
    factura: Factura | null;
    datosXML: unknown | null;
    ordenCompra: unknown | null;
  }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_GetFacturaPorID');

    return {
      factura: getFirstRecord<Factura>(result, 0),
      datosXML: getFirstRecord(result, 1),
      ordenCompra: getFirstRecord(result, 2)
    };
  }

  /**
   * SP 3: sp_GetFacturasStats
   * Estadísticas para dashboard de facturas (Admin)
   */
  async getFacturasStats(params: { empresa?: string; proveedor?: string; fechaDesde?: Date | string; fechaHasta?: Date | string } = {}): Promise<{
    totales: unknown;
    topProveedores: unknown[];
    porMes: unknown[];
    porEstatus: unknown[];
  }> {
    const { empresa, proveedor, fechaDesde, fechaHasta } = params;
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('Empresa', sql.VarChar(10), empresa || null)
      .input('Proveedor', sql.VarChar(20), proveedor || null)
      .input('FechaDesde', sql.Date, this.toDate(fechaDesde))
      .input('FechaHasta', sql.Date, this.toDate(fechaHasta))
      .execute('sp_GetFacturasStats');

    return {
      totales: getFirstRecord(result, 0) || {},
      topProveedores: getRecordset(result, 1),
      porMes: getRecordset(result, 2),
      porEstatus: getRecordset(result, 3)
    };
  }

  /**
   * SP 4: sp_GetFacturasProveedor
   * Facturas de un proveedor específico (Vista Proveedor)
   */
  async getFacturasProveedor(
    rfc: string,
    empresa: string,
    params: { estatus?: string; fechaDesde?: Date | string; fechaHasta?: Date | string; busqueda?: string; page?: number; limit?: number } = {}
  ): Promise<GetFacturasResult> {
    const {
      estatus = null,
      fechaDesde = null,
      fechaHasta = null,
      busqueda = null,
      page = 1,
      limit = 50
    } = params;

    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('RFC', sql.VarChar(13), rfc)
      .input('Empresa', sql.VarChar(10), empresa)
      .input('Estatus', sql.VarChar(20), estatus)
      .input('FechaDesde', sql.Date, this.toDate(fechaDesde))
      .input('FechaHasta', sql.Date, this.toDate(fechaHasta))
      .input('Busqueda', sql.VarChar(50), busqueda)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .execute('sp_GetFacturasProveedor');

    const facturas = getRecordset<Factura>(result, 0);
    const totalRecord = getFirstRecord<{ Total: number }>(result, 1);

    return {
      facturas,
      total: totalRecord?.Total || 0
    };
  }

  /**
   * SP 5: sp_GetFacturasProveedorStats
   * Estadísticas del proveedor
   */
  async getFacturasProveedorStats(rfc: string, empresa: string): Promise<{
    totales: unknown;
    porMes: unknown[];
  }> {
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('RFC', sql.VarChar(13), rfc)
      .input('Empresa', sql.VarChar(10), empresa)
      .execute('sp_GetFacturasProveedorStats');

    return {
      totales: getFirstRecord(result, 0) || {},
      porMes: getRecordset(result, 1)
    };
  }

  /**
   * SP 6: sp_ValidarFacturaDuplicada
   * Verifica si ya existe una factura con el mismo UUID
   */
  async validarFacturaDuplicada(uuid: string, empresa?: string): Promise<{
    existe: boolean;
    facturaId: number | null;
    folio: string | null;
    estatus: string | null;
  }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('UUID', sql.VarChar(36), uuid)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_ValidarFacturaDuplicada');

    const row = result.recordset?.[0] as { Existe?: boolean | number; FacturaID?: number; Folio?: string; Estatus?: string } | undefined;
    return {
      existe: row?.Existe === true || row?.Existe === 1,
      facturaId: row?.FacturaID || null,
      folio: row?.Folio || null,
      estatus: row?.Estatus || null
    };
  }

  /**
   * SP 7: sp_GetFacturaConOrdenCompra
   * Factura con OC para validación de conceptos
   */
  async getFacturaConOrdenCompra(facturaId: number, empresa?: string): Promise<{
    factura: unknown | null;
    ordenCompra: unknown | null;
    partidas: unknown[];
  }> {
    const pool = await this.getPool(empresa || '01');

    const result = await pool.request()
      .input('FacturaID', sql.Int, facturaId)
      .input('Empresa', sql.VarChar(10), empresa || null)
      .execute('sp_GetFacturaConOrdenCompra');

    return {
      factura: getFirstRecord(result, 0),
      ordenCompra: getFirstRecord(result, 1),
      partidas: getRecordset(result, 2)
    };
  }
}

// =============================================================================
// INSTANCIA SINGLETON
// =============================================================================

let instance: StoredProcedures | null = null;

export function getStoredProcedures(): StoredProcedures {
  if (!instance) {
    instance = new StoredProcedures();
  }
  return instance;
}

// Export default instance
export const storedProcedures = getStoredProcedures();
