// src/lib/database/multi-tenant-connection.ts
// Gestor de conexiones para arquitectura híbrida: Portal (PP) + ERP Intelisis

import sql from 'mssql';

/**
 * Configuración de empresas con sus respectivas BDs ERP
 */
export interface TenantERPConfig {
  id: string;
  nombre: string;
  erpDatabase: string;  // BD del ERP Intelisis (solo lectura)
  codigoEmpresa: string; // Código en tabla Empresa del ERP
}

const TENANT_CONFIGS: Record<string, TenantERPConfig> = {
  'la-cantera': {
    id: 'la-cantera',
    nombre: 'La Cantera Desarrollos Mineros',
    erpDatabase: 'Cantera', // Base de datos donde están los SPs
    codigoEmpresa: 'LCDM',
  },
  'peralillo': {
    id: 'peralillo',
    nombre: 'Peralillo S.A de C.V',
    erpDatabase: 'Peralillo_Ajustes', // Base real (con A mayúscula)
    codigoEmpresa: 'PERA',
  },
  'plaza-galerena': {
    id: 'plaza-galerena',
    nombre: 'Plaza Galereña',
    erpDatabase: 'GALBD_PRUEBAS', // Base real
    codigoEmpresa: 'PLAZ',
  },
  'icrear': {
    id: 'icrear',
    nombre: 'Icrear',
    erpDatabase: 'ICREAR_PRUEBAS', // Base real
    codigoEmpresa: 'ICRE',
  },
  'inmobiliaria-galerena': {
    id: 'inmobiliaria-galerena',
    nombre: 'Inmobiliaria Galereña',
    erpDatabase: 'GALBD_PRUEBAS', // Comparte BD con Plaza Galereña
    codigoEmpresa: 'INMO',
  },
};

/**
 * Pool de conexiones compartido para el Portal (PP)
 */
let portalPool: sql.ConnectionPool | null = null;

/**
 * Pools de conexiones por BD ERP (pueden ser compartidos si DB es la misma)
 */
const erpPools = new Map<string, sql.ConnectionPool>();

/**
 * Configuración base de conexión SQL Server - PORTAL
 */
const portalConfig = {
  server: process.env.MSSQL_SERVER!,
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
};

/**
 * Configuración base de conexión SQL Server - ERP
 */
const erpConfig = {
  server: process.env.MSSQL_ERP_SERVER!,
  user: process.env.MSSQL_ERP_USER!,
  password: process.env.MSSQL_ERP_PASSWORD!,
  options: {
    encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
};

/**
 * Obtiene el pool de conexión para la BD del Portal (PP)
 */
export async function getPortalConnection(): Promise<sql.ConnectionPool> {
  if (!portalPool || !portalPool.connected) {
    if (portalPool) {
      try {
        await portalPool.close();
      } catch (error) {
        console.log('[PORTAL] Error cerrando pool anterior:', error);
      }
    }
    
    const config: sql.config = {
      ...portalConfig,
      database: 'PP', // Tu BD del portal
      pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
      },
    };

    portalPool = new sql.ConnectionPool(config);
    await portalPool.connect();
    console.log('[PORTAL] Connected to PP database at', portalConfig.server);
  }

  return portalPool;
}

/**
 * Obtiene el pool de conexión para la BD ERP de un tenant
 * IMPORTANTE: Solo para lectura (SELECT)
 */
export async function getERPConnection(
  tenantId: string
): Promise<sql.ConnectionPool> {
  const tenantConfig = TENANT_CONFIGS[tenantId];

  if (!tenantConfig) {
    throw new Error(`Tenant no encontrado: ${tenantId}`);
  }

  const erpDatabase = tenantConfig.erpDatabase;

  // Verificar si el pool existe y está conectado
  const existingPool = erpPools.get(erpDatabase);
  if (!existingPool || !existingPool.connected) {
    if (existingPool) {
      try {
        await existingPool.close();
      } catch (error) {
        console.log(`[ERP] Error cerrando pool anterior para ${erpDatabase}:`, error);
      }
      erpPools.delete(erpDatabase);
    }
    
    const config: sql.config = {
      ...erpConfig,
      database: erpDatabase,
      pool: {
        max: 10, // Menos conexiones para ERP (solo lectura)
        min: 2,
        idleTimeoutMillis: 30000,
      },
    };

    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    erpPools.set(erpDatabase, pool);
    console.log(`[ERP] Connected to ${erpDatabase} at ${erpConfig.server} for tenant ${tenantId}`);
  }

  return erpPools.get(erpDatabase)!;
}

/**
 * Obtiene la configuración de un tenant
 */
export function getTenantConfig(tenantId: string): TenantERPConfig {
  const config = TENANT_CONFIGS[tenantId];
  if (!config) {
    throw new Error(`Configuración de tenant no encontrada: ${tenantId}`);
  }
  return config;
}

/**
 * Obtiene todos los tenants disponibles
 */
export function getAllTenants(): TenantERPConfig[] {
  return Object.values(TENANT_CONFIGS);
}

/**
 * Cierra todas las conexiones
 */
export async function closeAllConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (portalPool) {
    promises.push(portalPool.close());
  }

  for (const pool of erpPools.values()) {
    promises.push(pool.close());
  }

  await Promise.all(promises);

  portalPool = null;
  erpPools.clear();

  console.log('[DB] All connections closed');
}

/**
 * Contexto de tenant para queries
 */
export interface TenantContext {
  tenantId: string;
  empresaCodigo: string;
  proveedorCodigo?: string;
  userId: string;
  userRole: string;
}

/**
 * Database Manager Híbrido
 * Maneja queries al Portal (PP) y ERP (solo lectura)
 */
export class HybridDatabaseManager {
  /**
   * Query al Portal (lectura/escritura)
   */
  async queryPortal(
    queryString: string,
    params: Record<string, any> = {}
  ): Promise<sql.IResult<any>> {
    const pool = await getPortalConnection();
    const request = pool.request();

    // Agregar parámetros
    Object.entries(params).forEach(([key, value]) => {
      this.addParameter(request, key, value);
    });

    console.log('[PORTAL-QUERY]', queryString.substring(0, 100));
    return await request.query(queryString);
  }

  /**
   * Query al ERP (solo lectura - SELECT)
   */
  async queryERP(
    tenantId: string,
    queryString: string,
    params: Record<string, any> = {}
  ): Promise<sql.IResult<any>> {
    // Validar que sea solo SELECT
    if (!this.isReadOnlyQuery(queryString)) {
      throw new Error(
        'SECURITY_VIOLATION: Solo queries de lectura (SELECT) permitidas en BD ERP'
      );
    }

    const pool = await getERPConnection(tenantId);
    const request = pool.request();

    // Agregar parámetros
    Object.entries(params).forEach(([key, value]) => {
      this.addParameter(request, key, value);
    });

    console.log(`[ERP-QUERY][${tenantId}]`, queryString.substring(0, 100));
    return await request.query(queryString);
  }

  /**
   * Query híbrida: combina datos del Portal y ERP
   * Útil para joins entre tablas de ambas BDs
   */
  async queryHybrid(
    tenantId: string,
    portalQuery: string,
    erpQuery: string,
    portalParams: Record<string, any> = {},
    erpParams: Record<string, any> = {}
  ): Promise<{ portal: sql.IResult<any>; erp: sql.IResult<any> }> {
    const [portalResult, erpResult] = await Promise.all([
      this.queryPortal(portalQuery, portalParams),
      this.queryERP(tenantId, erpQuery, erpParams),
    ]);

    return { portal: portalResult, erp: erpResult };
  }

  /**
   * Valida que una query sea solo de lectura (SELECT)
   */
  private isReadOnlyQuery(query: string): boolean {
    const normalized = query.trim().toUpperCase();
    const readOnlyKeywords = ['SELECT', 'WITH'];
    const writeKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];

    const startsWithRead = readOnlyKeywords.some(keyword =>
      normalized.startsWith(keyword)
    );

    const containsWrite = writeKeywords.some(keyword =>
      normalized.includes(keyword)
    );

    return startsWithRead && !containsWrite;
  }

  /**
   * Agrega un parámetro al request con el tipo SQL correcto
   */
  private addParameter(
    request: sql.Request,
    key: string,
    value: any
  ): void {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'string') {
      request.input(key, sql.NVarChar, value);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(18, 2), value);
      }
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value);
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else {
      request.input(key, sql.NVarChar, value);
    }
  }
}

// Exportar instancia singleton
export const hybridDB = new HybridDatabaseManager();
