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
  '01': 'la-cantera',
  '02': 'peralillo',
  '03': 'plaza-galerena',
  '04': 'inmobiliaria-galerena',
  '05': 'icrear',
  '06': 'la-cantera',
  '07': 'peralillo',
  'LCDM': 'la-cantera',
  'PERA': 'peralillo',
  'PLAZ': 'plaza-galerena',
  'INMO': 'inmobiliaria-galerena',
  'ICRE': 'icrear',
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
    if (!empresa) return '01'; // Default general
    try {
      const config = getTenantConfig(empresa);
      return config.erpEmpresa;
    } catch (e) {
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
      empresa = '01',
      fechaDesde = null,
      fechaHasta = null,
      page = 1,
      limit = 50
    } = params;

    const pool = await this.getPool(empresa || '01');

    // Calcular cantidad de páginas para que el SP devuelve el total
    const cuantasPaginas = 1;

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY (formato que espera el SP)
    const formatDateForSP = (dateStr: string | null | undefined): string | null => {
      if (!dateStr) return null;
      // Si viene en formato YYYY-MM-DD, convertir a DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    };

    const fechaDesdeStr = formatDateForSP(fechaDesde as string);
    const fechaHastaStr = formatDateForSP(fechaHasta as string);

    console.log('[SP] Fechas enviadas:', { fechaDesdeStr, fechaHastaStr });

    const result = await pool.request()
      .input('Rfc', sql.VarChar(20), rfc)
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
      .input('FechaDesde', sql.VarChar(10), fechaDesdeStr)
      .input('FechaHasta', sql.VarChar(10), fechaHastaStr)
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
  async getOrdenCompraConDetalle(ordenId: number, empresa?: string): Promise<{
    encabezado: unknown | null;
    partidas: unknown[];
  }> {
    const pool = await this.getPool(empresa || '01');

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
      .input('Empresa', sql.VarChar(10), this.getEmpresaERP(empresa))
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
  async getFacturasStats(params: { empresa?: string; proveedor?: string; fechaDesde?: Date | string; fechaHasta?: Date | string } = {}): Promise<{
    totales: unknown;
    topProveedores: unknown[];
    porMes: unknown[];
    porEstatus: unknown[];
  }> {
    const { empresa, proveedor, fechaDesde, fechaHasta } = params;
    const pool = await this.getPool(empresa || '01');

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
  async validarFacturaDuplicada(uuid: string, empresa?: string): Promise<{
    existe: boolean;
    facturaId: number | null;
    folio: string | null;
    estatus: string | null;
  }> {
    const pool = await this.getPool(empresa || '01');

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
  async getFacturaConOrdenCompra(facturaId: number, empresa?: string): Promise<{
    factura: unknown | null;
    ordenCompra: unknown | null;
    partidas: unknown[];
  }> {
    const pool = await this.getPool(empresa || '01');

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
   * SP: spDatosProveedor
   * Gestiona datos de proveedores: Consulta, Alta, Modificación
   * 
   * @param params Parámetros del SP según la operación
   * @returns Resultado con datos del proveedor o confirmación de operación
   */
  async spDatosProveedor(params: ProveedorSPParams | ConsultaProveedorParams): Promise<SPProveedorResult> {
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
          .input('Nombre', sql.VarChar(100), str(fullParams.nombre))
          .input('NombreC', sql.VarChar(20), str(fullParams.nombreC))
          .input('RfcProv', sql.VarChar(15), str(fullParams.rfcProv))
          .input('Curp', sql.VarChar(30), str(fullParams.curp))
          .input('Regimen', sql.VarChar(30), str(fullParams.regimen))
          .input('Direccion', sql.VarChar(100), str(fullParams.direccion))
          .input('NumExt', sql.VarChar(20), str(fullParams.numExt))
          .input('NumInt', sql.VarChar(20), str(fullParams.numInt))
          .input('EntreCalles', sql.VarChar(100), str(fullParams.entreCalles))
          .input('Colonia', sql.VarChar(100), str(fullParams.colonia))
          .input('Poblacion', sql.VarChar(100), str(fullParams.poblacion))
          .input('Estado', sql.VarChar(30), str(fullParams.estado))
          .input('Pais', sql.VarChar(100), str(fullParams.pais))
          .input('Codigopostal', sql.VarChar(15), str(fullParams.codigoPostal))
          .input('Contacto1', sql.VarChar(50), str(fullParams.contacto1))
          .input('Contacto2', sql.VarChar(50), str(fullParams.contacto2))
          .input('Email1', sql.VarChar(50), str(fullParams.email1))
          .input('Email2', sql.VarChar(50), str(fullParams.email2))
          .input('Telefonos', sql.VarChar(100), str(fullParams.telefonos))
          .input('Fax', sql.VarChar(50), str(fullParams.fax))
          .input('Extension1', sql.VarChar(10), str(fullParams.extension1))
          .input('Extension2', sql.VarChar(10), str(fullParams.extension2))
          .input('BancoSucursal', sql.VarChar(50), str(fullParams.bancoSucursal))
          .input('Cuenta', sql.VarChar(20), str(fullParams.cuenta))
          .input('Beneficiario', sql.Int, fullParams.beneficiario ?? 0)
          .input('BeneficiarioNombre', sql.VarChar(100), str(fullParams.beneficiarioNombre))
          .input('LeyendaCheque', sql.VarChar(100), str(fullParams.leyendaCheque));
      }

      console.log(`[SP EXEC] Parameters for ${operacion}:`, {
        Empresa: this.getEmpresaERP(empresa),
        Operacion: operacion,
        Rfc: operacion === 'C' ? '' : rfc,
        Proveedor: operacion === 'C' ? '' : proveedor,
        CveProv: cveProv
      });

      const result = await request.execute('spDatosProveedor');

      DebugStore.lastResult = {
        recordset: result.recordset,
        rowsAffected: result.rowsAffected,
        timestamp: new Date().toISOString()
      };

      console.log(`[SP RESULT] spDatosProveedor ejecutado. Recordsets: ${result.recordsets.length}`);
      if (result.recordset && result.recordset.length > 0) {
        console.log('[SP RESULT DATA]', result.recordset[0]);
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
      const spErrorMessage = confirmacion?.Error || confirmacion?.Mensaje || confirmacion?.error || confirmacion?.ErrorMessage;

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