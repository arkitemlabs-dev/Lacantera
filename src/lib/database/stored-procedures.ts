/**
 * Stored Procedures - Conexión a Intelisis
 *
 * Este módulo centraliza todas las llamadas a stored procedures
 * del ERP Intelisis (Base de datos Cantera)
 */

import sql from 'mssql';
import { getERPConnection, getTenantConfig } from './multi-tenant-connection';
import type {
  ProveedorSPParams,
  ConsultaProveedorParams,
  ProveedorERP,
  SPProveedorResult
} from '@/types/admin-proveedores';

// DEBUG STORE GLOBAL
class DebugStore {
  static lastCall: any = null;
  static lastResult: any = null;
  static error: any = null;
}

export { DebugStore };

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
  '01': 'la-cantera-prod',
  '02': 'peralillo-prod',
  '03': 'plaza-galerena-prod',
  '04': 'inmobiliaria-galerena-prod',
  '05': 'icrear-prod',
  '06': 'la-cantera-test',
  '07': 'peralillo-test',
  '08': 'plaza-galerena-test',
  '09': 'inmobiliaria-galerena-test',
  '10': 'icrear-test',
  'LCDM': 'la-cantera-prod',
  'PERA': 'peralillo-prod',
  'PLAZ': 'plaza-galerena-prod',
  'INMO': 'inmobiliaria-galerena-prod',
  'ICRE': 'icrear-prod',
  // Tenant IDs directos (nuevos con sufijo)
  'la-cantera-prod': 'la-cantera-prod',
  'la-cantera-test': 'la-cantera-test',
  'peralillo-prod': 'peralillo-prod',
  'peralillo-test': 'peralillo-test',
  'plaza-galerena-prod': 'plaza-galerena-prod',
  'plaza-galerena-test': 'plaza-galerena-test',
  'inmobiliaria-galerena-prod': 'inmobiliaria-galerena-prod',
  'inmobiliaria-galerena-test': 'inmobiliaria-galerena-test',
  'icrear-prod': 'icrear-prod',
  'icrear-test': 'icrear-test',
  // Legacy (sin sufijo) → fallback a test
  'la-cantera': 'la-cantera-test',
  'peralillo': 'peralillo-test',
  'plaza-galerena': 'plaza-galerena-test',
  'inmobiliaria-galerena': 'inmobiliaria-galerena-test',
  'icrear': 'icrear-test',
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
  private async getPool(empresaCode: string = 'la-cantera'): Promise<sql.ConnectionPool> {
    const tenantId = empresaToTenant(empresaCode);
    return await getERPConnection(tenantId);
  }

  /**
   * Helper para obtener el código de empresa del ERP basado en tenant o parámetro
   */
  private getEmpresaERP(empresa: string | null | undefined): string {
    if (!empresa) {
      // STRICT SCENARIO: Never default to Production '01' without explicit instruction.
      throw new Error('[SP SECURITY] El código de empresa es OBLIGATORIO. No se permite defaulting a Producción.');
    }
    try {
      const config = getTenantConfig(empresa);
      console.log(`[SP] getEmpresaERP: ${empresa} -> ${config.erpEmpresa}`);
      return config.erpEmpresa;
    } catch (e) {
      console.log(`[SP] getEmpresaERP: ${empresa} no encontrado en config, retornando como está`);
      return empresa;
    }
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
   * SP 3: sp_GetOrdenesCompra
   * Lista órdenes de compra PENDIENTES con paginación y filtros (Vista Admin)
   * El SP fue modificado para solo retornar órdenes pendientes (sin parámetro de estatus)
   *
   * Parámetros del SP:
   * @RfcProv VARCHAR(20), @Empresa VARCHAR(5),
   * @FechaDesde DATE, @FechaHasta DATE, @Page INT, @Limit INT, @CuantasPaginas INT
   */
  async getOrdenesCompra(params: GetOrdenesCompraParams = {}): Promise<GetOrdenesCompraResult> {
    const {
      rfc = null,
      limit = 50
    } = params;

    // Validate required empresa
    if (!empresa) throw new Error('Empresa es requerida para getOrdenesCompra');

    const pool = await this.getPool(empresa || '01');

    // Calcular cantidad de páginas para que el SP devuelve el total
    const cuantasPaginas = 1;

    // Convertir fechas de string YYYY-MM-DD a objeto Date para sql.Date
    const parseDateForSP = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return new Date(dateStr);
    };

    const fechaDesdeDate = parseDateForSP(fechaDesde as string);
    const fechaHastaDate = parseDateForSP(fechaHasta as string);

    console.log('[SP] Fechas enviadas:', { fechaDesdeDate, fechaHastaDate });

    const result = await pool.request()
      .input('Rfc', sql.VarChar(20), rfc)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
      .input('FechaDesde', sql.Date, fechaDesdeDate)
      .input('FechaHasta', sql.Date, fechaHastaDate)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .input('CuantasPaginas', sql.Int, cuantasPaginas)
      .execute('sp_GetOrdenesCompra');

    console.log(`[SP] Recordsets devueltos: ${result.recordsets.length}`);

    const ordenes = getRecordset<OrdenCompra>(result, 0);

    // El SP puede devolver el total en el segundo recordset
    const totalRecord = getFirstRecord<{ Total?: number; Registros?: number; TotalRegistros?: number }>(result, 1);

    console.log(`[SP] Órdenes encontradas: ${ordenes.length}`);
    console.log(`[SP] Total desde SP:`, totalRecord);

    return {
      ordenes,
      total: totalRecord?.Total || totalRecord?.Registros || 0
    };
  }

  /**
   * SP 5: sp_GetOrdenCompraConDetalle
   * Orden con partidas (2 result sets)
   */
  async getOrdenCompraConDetalle(ordenId: number, empresa: string): Promise<{
    encabezado: unknown | null;
    partidas: unknown[];
  }> {
    if (!empresa) throw new Error('Empresa es requerida para getOrdenCompraConDetalle');
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('OrdenID', sql.Int, ordenId)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
  async getPartidasOrdenCompra(ordenId: number, empresa: string): Promise<unknown[]> {
    if (!empresa) throw new Error('Empresa es requerida para getPartidasOrdenCompra');
    const pool = await this.getPool(empresa);

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
      empresa, // Required
      estatus = null,
      fechaDesde = null,
      fechaHasta = null,
      numeroFactura = null,
      page = 1,
      limit = 10
    } = params;

    if (!empresa) throw new Error('Empresa es requerida para getFacturas');

    const empresaERP = this.getEmpresaERP(empresa);
    console.log(`[SP getFacturas] Parámetros: empresa=${empresa}, empresaERP=${empresaERP}, estatus=${estatus}, page=${page}, limit=${limit}`);

    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('Proveedor', sql.VarChar(20), proveedor)
      .input('RFC', sql.VarChar(13), rfc)
      .input('Empresa', sql.VarChar(10), empresaERP)
      .input('Estatus', sql.VarChar(20), estatus)
      .input('FechaDesde', sql.Date, this.toDate(fechaDesde))
      .input('FechaHasta', sql.Date, this.toDate(fechaHasta))
      .input('NumeroFactura', sql.VarChar(50), numeroFactura)
      .input('Page', sql.Int, page)
      .input('Limit', sql.Int, limit)
      .execute('sp_GetFacturas');

    const facturas = getRecordset<Factura>(result, 0);
    const totalRecord = getFirstRecord<{ Total: number }>(result, 1);

    console.log(`[SP getFacturas] Resultados: ${facturas.length} facturas, total=${totalRecord?.Total || 0}`);
    if (facturas.length > 0) {
      console.log('[SP getFacturas] Campos disponibles:', Object.keys(facturas[0]));
    }

    return {
      facturas,
      total: totalRecord?.Total || 0
    };
  }

  /**
   * SP 2: sp_GetFacturaPorID
   * Detalle completo de una factura
   */
  async getFacturaPorID(id: number, empresa: string): Promise<{
    factura: Factura | null;
    datosXML: unknown | null;
    ordenCompra: unknown | null;
  }> {
    if (!empresa) throw new Error('Empresa es requerida para getFacturaPorID');
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('ID', sql.Int, id)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
  async getFacturasStats(params: { empresa: string; proveedor?: string; fechaDesde?: Date | string; fechaHasta?: Date | string }): Promise<{
    totales: unknown;
    topProveedores: unknown[];
    porMes: unknown[];
    porEstatus: unknown[];
  }> {
    const { empresa, proveedor, fechaDesde, fechaHasta } = params;
    if (!empresa) throw new Error('Empresa es requerida para getFacturasStats');
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
  async validarFacturaDuplicada(uuid: string, empresa: string): Promise<{
    existe: boolean;
    facturaId: number | null;
    folio: string | null;
    estatus: string | null;
  }> {
    if (!empresa) throw new Error('Empresa es requerida para validarFacturaDuplicada');
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('UUID', sql.VarChar(36), uuid)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
  async getFacturaConOrdenCompra(facturaId: number, empresa: string): Promise<{
    factura: unknown | null;
    ordenCompra: unknown | null;
    partidas: unknown[];
  }> {
    if (!empresa) throw new Error('Empresa es requerida para getFacturaConOrdenCompra');
    const pool = await this.getPool(empresa);

    const result = await pool.request()
      .input('FacturaID', sql.Int, facturaId)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
      .execute('sp_GetFacturaConOrdenCompra');

    return {
      factura: getFirstRecord(result, 0),
      ordenCompra: getFirstRecord(result, 1),
      partidas: getRecordset(result, 2)
    };
  }

  // ===========================================================================
  // PROVEEDORES
  // ===========================================================================

  /**
   * SP: sp_getProveedores
   * Lista todos los proveedores de una empresa
   * Retorna 2 recordsets: [0] datos de proveedores, [1] total
   */
  async getProveedoresLista(params: {
    empresa: string;
  }): Promise<{ proveedores: any[]; total: number }> {
    const { empresa } = params;
    const pool = await this.getPool(empresa);
    const empresaERP = this.getEmpresaERP(empresa);

    console.log(`[SP] sp_getProveedores - Empresa: ${empresaERP}`);

    const result = await pool.request()
      .input('Empresa', sql.VarChar(10), empresaERP)
      .execute('sp_getProveedores');

    const proveedores = getRecordset(result, 0);
    const totalRecord = getFirstRecord<{ Total?: number }>(result, 1);

    console.log(`[SP] sp_getProveedores - ${proveedores.length} proveedores, total: ${totalRecord?.Total || proveedores.length}`);

    return {
      proveedores: proveedores as any[],
      total: totalRecord?.Total || proveedores.length,
    };
  }

  /**
   * SP: spDatosProveedor
   * Gestiona datos de proveedores: Consulta, Alta, Modificación
   * 
   * @param params Parámetros del SP según la operación
   * @returns Resultado con datos del proveedor o confirmación de operación
   */
  async spDatosProveedor(params: ProveedorSPParams | ConsultaProveedorParams): Promise<SPProveedorResult> {
    console.log('[SP DEBUG] spDatosProveedor received params:', JSON.stringify(params, null, 2));
    const {
      empresa,
      operacion,
      rfc = '',
      proveedor = '',
      cveProv = ''
    } = params;

    try {
      const config = getTenantConfig(empresa);
      const pool = await this.getPool(empresa);

      // Debug: verificar conexión exacta
      const dbCheck = await pool.request().query("SELECT DB_NAME() AS db, SUSER_NAME() AS usuario, @@SERVERNAME AS servidor");
      console.log('[SP CONNECTION]', dbCheck.recordset[0]);

      const request = pool.request()
        .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
        .input('Operacion', sql.VarChar(1), operacion)
        // REGLA: Solo buscar por clave de proveedor (CveProv)
        // Por seguridad, vaciamos Rfc y Proveedor (que son campos de búsqueda) en consultas
        .input('Rfc', sql.VarChar(20), operacion === 'C' ? '' : rfc)
        .input('Proveedor', sql.VarChar(200), operacion === 'C' ? '' : proveedor)
        .input('CveProv', sql.VarChar(10), cveProv);

      // Solo agregar parámetros adicionales para operaciones de Alta/Modificación
      if (operacion === 'A' || operacion === 'M') {
        const fullParams = params as ProveedorSPParams;

        console.log(`[SP DEBUG] Parametros para ${operacion === 'A' ? 'Alta' : 'Modificación'}:`, {
          Nombre: fullParams.nombre,
          RfcProv: fullParams.rfcProv,
          Telefonos: fullParams.telefonos,
          CveProv: cveProv
        });

        // Helper: enviar cadena vacía '' en lugar de null para campos sin valor
        const str = (val: string | undefined | null): string =>
          (val != null ? val.trim() : '');

        request
          .input('Nombre', sql.NVarChar(100), str(fullParams.nombre))
          .input('NombreC', sql.NVarChar(20), str(fullParams.nombreC))
          .input('RfcProv', sql.VarChar(15), str(fullParams.rfcProv))
          .input('Curp', sql.VarChar(30), str(fullParams.curp))
          .input('Regimen', sql.NVarChar(30), str(fullParams.regimen))
          .input('Direccion', sql.NVarChar(100), str(fullParams.direccion))
          .input('NumExt', sql.VarChar(20), str(fullParams.numExt))
          .input('NumInt', sql.VarChar(20), str(fullParams.numInt))
          .input('EntreCalles', sql.NVarChar(100), str(fullParams.entreCalles))
          .input('Colonia', sql.NVarChar(100), str(fullParams.colonia))
          .input('Poblacion', sql.NVarChar(100), str(fullParams.poblacion))
          .input('Estado', sql.NVarChar(30), str(fullParams.estado))
          .input('Pais', sql.NVarChar(100), str(fullParams.pais))
          .input('Codigopostal', sql.VarChar(15), str(fullParams.codigoPostal))
          .input('Contacto1', sql.NVarChar(50), str(fullParams.contacto1))
          .input('Contacto2', sql.NVarChar(50), str(fullParams.contacto2))
          .input('Email1', sql.VarChar(50), str(fullParams.email1))
          .input('Email2', sql.VarChar(50), str(fullParams.email2))
          .input('Telefonos', sql.VarChar(100), str(fullParams.telefonos))
          .input('Fax', sql.VarChar(50), str(fullParams.fax))
          .input('Extension1', sql.VarChar(10), str(fullParams.extension1))
          .input('Extension2', sql.VarChar(10), str(fullParams.extension2))
          .input('BancoSucursal', sql.NVarChar(50), str(fullParams.bancoSucursal))
          .input('Cuenta', sql.VarChar(20), str(fullParams.cuenta))
          .input('Beneficiario', sql.Int, fullParams.beneficiario ?? 0)
          .input('BeneficiarioNombre', sql.NVarChar(100), str(fullParams.beneficiarioNombre))
          .input('LeyendaCheque', sql.NVarChar(100), str(fullParams.leyendaCheque));
      }

      console.log(`[SP EXEC] Parameters for ${operacion}:`, {
        Empresa: this.getEmpresaERP(empresa),
        Operacion: operacion,
        Rfc: operacion === 'C' ? '' : rfc,
        Proveedor: operacion === 'C' ? '' : proveedor,
        CveProv: cveProv
      });

      if (operacion === 'M' || operacion === 'A') {
        const fullParams = params as ProveedorSPParams;
        const s = (val: string | undefined | null): string => (val != null ? val.trim() : '');
        // Generar EXEC para copiar/pegar en SSMS y probar el SP directamente
        const execSQL = `EXEC spDatosProveedor
  @Empresa = '${this.getEmpresaERP(empresa)}',
  @Operacion = '${operacion}',
  @Rfc = '${operacion === 'C' ? '' : rfc}',
  @Proveedor = '${operacion === 'C' ? '' : proveedor}',
  @CveProv = '${cveProv}',
  @Nombre = '${s(fullParams.nombre)}',
  @NombreC = '${s(fullParams.nombreC)}',
  @RfcProv = '${s(fullParams.rfcProv)}',
  @Curp = '${s(fullParams.curp)}',
  @Regimen = '${s(fullParams.regimen)}',
  @Direccion = '${s(fullParams.direccion)}',
  @NumExt = '${s(fullParams.numExt)}',
  @NumInt = '${s(fullParams.numInt)}',
  @EntreCalles = '${s(fullParams.entreCalles)}',
  @Colonia = '${s(fullParams.colonia)}',
  @Poblacion = '${s(fullParams.poblacion)}',
  @Estado = '${s(fullParams.estado)}',
  @Pais = '${s(fullParams.pais)}',
  @Codigopostal = '${s(fullParams.codigoPostal)}',
  @Contacto1 = '${s(fullParams.contacto1)}',
  @Contacto2 = '${s(fullParams.contacto2)}',
  @Email1 = '${s(fullParams.email1)}',
  @Email2 = '${s(fullParams.email2)}',
  @Telefonos = '${s(fullParams.telefonos)}',
  @Fax = '${s(fullParams.fax)}',
  @Extension1 = '${s(fullParams.extension1)}',
  @Extension2 = '${s(fullParams.extension2)}',
  @BancoSucursal = '${s(fullParams.bancoSucursal)}',
  @Cuenta = '${s(fullParams.cuenta)}',
  @Beneficiario = ${fullParams.beneficiario ?? 0},
  @BeneficiarioNombre = '${s(fullParams.beneficiarioNombre)}',
  @LeyendaCheque = '${s(fullParams.leyendaCheque)}'`;
        console.log('\n========================================');
        console.log('[SP TEST] COPIA ESTO EN SSMS PARA PROBAR:');
        console.log('========================================');
        console.log(execSQL);
        console.log('========================================\n');
      }

      const result = await request.execute('spDatosProveedor');

      DebugStore.lastResult = {
        recordset: result.recordset,
        rowsAffected: result.rowsAffected,
        timestamp: new Date().toISOString()
      };

      console.log(`[SP RESULT] spDatosProveedor ejecutado. Recordsets: ${result.recordsets.length}`);
      console.log(`[SP RESULT] Rows Affected:`, result.rowsAffected);

      if (result.recordset && result.recordset.length > 0) {
        console.log('[SP RESULT DATA (Record 0)]', result.recordset[0]);
      }

      if (result.recordsets && result.recordsets.length > 1 && result.recordsets[1].length > 0) {
        console.log('[SP RESULT DATA (Recordset 1, Record 0)]', result.recordsets[1][0]);
      }

      // Para consultas, devolver los datos del recordset
      if (operacion === 'C') {
        const proveedores = getRecordset<ProveedorERP>(result, 0);
        return {
          success: true,
          data: proveedores,
          message: `${proveedores.length} proveedor(es) encontrado(s)`
        };
      }

      // Para Alta/Modificación, validar el resultado
      const confirmacion = getFirstRecord(result, 0) as any;

      // Verificar si hay mensaje de error del SP
      const spErrorMessage = confirmacion?.Error || confirmacion?.Mensaje || confirmacion?.error || confirmacion?.ErrorMessage || confirmacion?.[''];

      // Determinar si fue exitoso
      let spSuccess = true;

      if (spErrorMessage) {
        const errorLower = spErrorMessage.toString().toLowerCase();
        // Si contiene palabras de error, marcar como fallido
        if (errorLower.includes('error') && !errorLower.includes('exito') && !errorLower.includes('correcto')) {
          spSuccess = false;
        }
        // Si contiene palabras de éxito, marcar como exitoso
        if (errorLower.includes('exito') || errorLower.includes('correcto') || errorLower.includes('actualizado') || errorLower.includes('guardado')) {
          spSuccess = true;
        }
      }

      // Si rowsAffected es 0, puede indicar que no se actualizó nada
      if (result.rowsAffected && result.rowsAffected[0] === 0 && operacion === 'M') {
        console.warn('[SP WARNING] rowsAffected es 0, puede que no se haya actualizado nada');
      }

      const successMessage = operacion === 'A'
        ? 'Proveedor creado exitosamente'
        : 'Proveedor actualizado exitosamente';

      return {
        success: spSuccess,
        data: confirmacion ? [confirmacion] : [],
        error: spSuccess ? undefined : (spErrorMessage || 'Error desconocido en el stored procedure'),
        message: spSuccess ? successMessage : spErrorMessage
      };

    } catch (error: any) {
      console.error('[SP] Error en spDatosProveedor:', error);

      return {
        success: false,
        data: [],
        error: error.message || 'Error desconocido en el stored procedure',
        message: `Error en operación ${operacion} para empresa ${empresa}`
      };
    }
  }

  // ===========================================================================
  // REMISIÓN DE COMPRA
  // ===========================================================================

  /**
   * SP: spGeneraRemisionCompra
   * Genera una remisión de compra a partir de una orden y un documento digital (XML)
   *
   * @param empresa - Clave de la empresa (ej. '01')
   * @param moId - Folio de la orden de compra (ingresado manualmente)
   * @param factura - Serie + Folio de la factura
   * @param rutaArchivo - Path donde se guarda el documento digital
   * @param archivo - Nombre y extensión del archivo digital
   */
  async generaRemisionCompra(params: {
    empresa: string;
    movId: string;
    factura: string;
  }): Promise<{ success: boolean; data: any; message: string }> {
    const { empresa, movId, factura } = params;

    try {
      const pool = await this.getPool(empresa);
      const empresaERP = this.getEmpresaERP(empresa);

      // Determine if we are in Production or Test based on the Company Code
      // Prod: 01, 02, 03, 04, 05
      // Test: 06, 07, 08, 09, 10
      const isTestEmpresa = ['06', '07', '08', '09', '10'].includes(empresaERP);

      console.log(`[SP] spGeneraRemisionCompra - Empresa: ${empresaERP}, IsTest: ${isTestEmpresa}, MovId: ${movId}, Factura: ${factura}`);

      if (isTestEmpresa) {
        // --- LOGICA PARA BASE DE DATOS DE PRUEBAS (Cantera_Ajustes) ---
        // Params: @Empresa, @MovId, @Factura
        const result = await pool.request()
          .input('Empresa', sql.VarChar(5), empresaERP)
          .input('MovId', sql.VarChar(20), movId)
          .input('Factura', sql.VarChar(20), factura)
          .execute('spGeneraRemisionCompra');

        console.log(`[SP - TEST] spGeneraRemisionCompra ejecutado.`);
        const firstRecord = result.recordset?.[0] as any;
        return {
          success: true,
          data: firstRecord || null,
          message: firstRecord?.Mensaje || 'Remisión generada correctamente (Test)'
        };

      } else {
        // --- BLOQUEO DE SEGURIDAD PARA PRODUCCION ---
        // El usuario indicó explícitamente que NO se debe tocar producción durante las pruebas.
        // Si llegamos aquí, es porque el frontend envió una empresa de producción (01-05).

        console.warn(`[SP - PROD BLOCKED] Intento de escritura en Producción detectado para empresa ${empresaERP}`);

        return {
          success: false,
          data: null,
          message: `🛑 SEGURIDAD: Estás intentando subir una factura a la empresa de PRODUCCIÓN (${empresaERP}). Para realizar pruebas, por favor selecciona la empresa '[TEST]' correspondiente (ej. La Cantera [TEST]) en el selector de empresas.`
        };
      }
    } catch (error: any) {
      console.error('[SP] Error en spGeneraRemisionCompra:', error);

      // Fallback inteligente: si falla por parámetros en Prod, intentamos la firma de Test (y viceversa si fuera necesario)
      // Esto ayuda si la BD de test es actualizada a la estructura de prod sin que actualicemos el código
      if (error.message && error.message.includes('expects parameter')) {
        console.warn('[SP] Detectado error de parámetros. Verificando versión del SP...');
        // Aquí podríamos hacer un retry con la otra firma si fuera crítico,
        // por ahora devolvemos el error claro.
        return {
          success: false,
          data: null,
          message: `Error de compatibilidad con SP: ${error.message}. Verifica si estás en la empresa correcta (Test vs Prod).`
        };
      }

      return {
        success: false,
        data: null,
        message: error.message || 'Error al generar remisión de compra'
      };
    }
  }

  /**
   * Método helper para consultar un proveedor específico
   * Simplifica las consultas más comunes
   */
  async consultarProveedor(params: {
    empresa: string;
    codigo: string;
  }): Promise<SPProveedorResult<ProveedorERP | null>> {
    const consultaParams: ConsultaProveedorParams = {
      empresa: params.empresa,
      operacion: 'C',
      cveProv: params.codigo
    };

    const result = await this.spDatosProveedor(consultaParams);

    if (result.success && Array.isArray(result.data) && result.data.length > 0) {
      return {
        ...result,
        data: result.data[0] as ProveedorERP
      };
    }

    return {
      ...result,
      data: null,
      message: 'Proveedor no encontrado'
    };
  }

  /**
   * Método helper para crear un nuevo proveedor
   */
  async crearProveedor(params: Omit<ProveedorSPParams, 'operacion'> & { empresa: string }): Promise<SPProveedorResult> {
    const createParams: ProveedorSPParams = {
      ...params,
      operacion: 'A'
    };

    return await this.spDatosProveedor(createParams);
  }

  /**
   * Método helper para actualizar un proveedor existente
   */
  async actualizarProveedor(params: Omit<ProveedorSPParams, 'operacion'> & { empresa: string }): Promise<SPProveedorResult> {
    const updateParams: ProveedorSPParams = {
      ...params,
      operacion: 'M'
    };

    return await this.spDatosProveedor(updateParams);
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