// src/types/admin-proveedores.ts
// Tipos específicos para gestión de proveedores por admin

// =============================================================================
// TIPOS PARA SP spDatosProveedor
// =============================================================================

/**
 * Operaciones disponibles en el SP spDatosProveedor
 */
export type OperacionProveedor = 'C' | 'A' | 'M'; // Consulta, Alta, Modificar (No existe Baja/Eliminar)

/**
 * Parámetros para consultar un proveedor específico
 */
export interface ConsultaProveedorParams {
  empresa: string;           // Obligatorio
  operacion: 'C';           // Consulta
  rfc?: string;             // Buscar por RFC
  proveedor?: string;       // Buscar por Nombre del proveedor
  cveProv?: string;         // Buscar por Clave del proveedor
}

/**
 * Parámetros completos para crear/modificar un proveedor
 */
export interface ProveedorSPParams {
  // Obligatorios
  empresa: string;          // VARCHAR(10)
  operacion: OperacionProveedor; // 'C', 'A', 'M'

  // Para búsqueda (solo en consultas)
  rfc?: string;             // VARCHAR(20)
  proveedor?: string;       // VARCHAR(200) - Nombre para búsqueda
  cveProv?: string;         // VARCHAR(10) - Clave para búsqueda

  // Datos del proveedor (obligatorios para Alta/Modificación)
  nombre?: string;          // VARCHAR(100)
  nombreC?: string;         // VARCHAR(20) - Nombre corto
  rfcProv?: string;         // VARCHAR(15) - RFC del proveedor
  curp?: string;            // VARCHAR(30)
  regimen?: string;         // VARCHAR(30)

  // Dirección
  direccion?: string;       // VARCHAR(100)
  numExt?: string;          // VARCHAR(20)
  numInt?: string;          // VARCHAR(20)
  entreCalles?: string;     // VARCHAR(100)
  colonia?: string;         // VARCHAR(100)
  poblacion?: string;       // VARCHAR(100)
  estado?: string;          // VARCHAR(30)
  pais?: string;            // VARCHAR(100)
  codigoPostal?: string;    // VARCHAR(15)

  // Contactos
  contacto1?: string;       // VARCHAR(50)
  contacto2?: string;       // VARCHAR(50)
  email1?: string;          // VARCHAR(50)
  email2?: string;          // VARCHAR(50)
  telefonos?: string;       // VARCHAR(100)
  fax?: string;             // VARCHAR(50)
  extension1?: string;      // VARCHAR(10)
  extension2?: string;      // VARCHAR(10)

  // Información bancaria
  bancoSucursal?: string;   // VARCHAR(50)
  cuenta?: string;          // VARCHAR(20)
  beneficiario?: number;    // INT
  beneficiarioNombre?: string; // VARCHAR(100)
  leyendaCheque?: string;   // VARCHAR(100)
}

/**
 * Datos completos de un proveedor retornados por el SP
 */
export interface ProveedorERP {
  // Identificación
  Proveedor: string;
  Nombre: string;
  NombreCorto?: string;
  RFC?: string;
  CURP?: string;
  FiscalRegimen?: string;

  // Dirección
  Direccion?: string;
  DireccionNumero?: string;
  DireccionNumeroInt?: string;
  EntreCalles?: string;
  Colonia?: string;
  Poblacion?: string;
  Estado?: string;
  Pais?: string;
  CodigoPostal?: string;

  // Contacto
  Contacto1?: string;
  Contacto2?: string;
  Telefonos?: string;
  Fax?: string;
  Extencion1?: string;
  Extencion2?: string;
  eMail1?: string;
  eMail2?: string;

  // Comercial
  Categoria?: string;
  Familia?: string;
  Descuento?: number;
  Comprador?: string;
  Condicion?: string;
  FormaPago?: string;
  DiaRevision1?: string;
  DiaRevision2?: string;
  DiaPago1?: string;
  DiaPago2?: string;

  // Bancario
  ProvBancoSucursal?: string;
  ProvCuenta?: string;
  Beneficiario?: number;
  BeneficiarioNombre?: string;
  LeyendaCheque?: string;

  // Control
  Agente?: string;
  Situacion?: string;
  SituacionFecha?: Date;
  SituacionUsuario?: string;
  SituacionNota?: string;
  Estatus?: string;
  UltimoCambio?: Date;
  Alta?: Date;
  Tipo?: string;
  DefMoneda?: string;
  TieneMovimientos?: boolean;
  CentroCostos?: string;
  Cuenta?: string;
  CuentaRetencion?: string;
  Comision?: number;
  Importe1?: number;
  Importe2?: number;
}

// =============================================================================
// TIPOS PARA LA GESTIÓN DE PROVEEDORES (ADMIN)
// =============================================================================

/**
 * Resultado de operaciones de SP
 */
export interface SPProveedorResult<T = ProveedorERP[]> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Filtros para buscar proveedores
 */
export interface FiltrosProveedoresAdmin {
  empresaCode?: string;
  estatusPortal?: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE';
  busqueda?: string;
  tipoProveedor?: string;
  page?: number;
  limit?: number;
}

/**
 * Estadísticas de proveedores
 */
export interface ProveedoresStats {
  total: number;
  porEstatus: Array<{
    estatus: string;
    cantidad: number;
  }>;
  conMapeo: number;
  sinMapeo: number;
  porEmpresa: Array<{
    empresaCode: string;
    empresaName: string;
    cantidad: number;
  }>;
  registrosRecientes: number;
}

/**
 * Datos para formulario de proveedor (frontend)
 */
export interface FormProveedorAdmin {
  // Identificación
  nombre: string;
  nombreCorto?: string;
  rfc: string;
  curp?: string;
  regimen?: string;

  // Dirección
  direccion?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  entreCalles?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  pais?: string;
  codigoPostal?: string;

  // Contacto
  contactoPrincipal?: string;
  contactoSecundario?: string;
  telefonos?: string;
  fax?: string;
  extension1?: string;
  extension2?: string;
  email1?: string;
  email2?: string;

  // Información bancaria
  banco?: string;
  cuentaBancaria?: string;
  beneficiario?: number;
  nombreBeneficiario?: string;
  leyendaCheque?: string;

  // Comercial
  categoria?: string;
  condicionPago?: string;
  formaPago?: string;
  descuento?: number;

  // Sistema
  empresa: string;
  activo: boolean;
  cveProv?: string; // Código de proveedor como identificador
}

/**
 * Respuesta de validaciones del formulario
 */
export interface ValidacionProveedor {
  valido: boolean;
  errores: string[];
  warnings?: string[];
}

/**
 * Tipos de error en operaciones de proveedores
 */
export type ErrorTipoProveedor =
  | 'PROVEEDOR_NO_ENCONTRADO'
  | 'RFC_DUPLICADO'
  | 'DATOS_INCOMPLETOS'
  | 'ERROR_CONEXION_ERP'
  | 'PERMISOS_INSUFICIENTES'
  | 'VALIDACION_FALLIDA';

/**
 * Error estructurado para proveedores
 */
export interface ErrorProveedor {
  tipo: ErrorTipoProveedor;
  mensaje: string;
  detalles?: string;
  campo?: string;
}