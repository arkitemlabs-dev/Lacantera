// src/lib/database/multi-tenant-connection.ts
// Gestor de conexiones para arquitectura híbrida: Portal (PP) + ERP Intelisis

import sql from 'mssql';
import { ERP_DATABASES, validateEmpresaCode, type ERPDatabaseConfig } from './tenant-configs';

/**
 * Pool de conexiones compartido para el Portal (PP)
 */
let portalPool: sql.ConnectionPool | null = null;

/**
 * Pools de conexiones por BD ERP (compartidos si DB es la misma)
 * Clave = nombre de la BD (ej: 'Galbd', 'Cantera_ajustes')
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
      database: 'PP',
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
 * Obtiene el pool de conexión para la BD ERP de una empresa.
 * El sistema usa exclusivamente códigos numéricos de empresa (01–10).
 * Pools se comparten por nombre de BD (ej: '03' y '04' comparten pool 'Galbd').
 */
export async function getERPConnection(
  empresaInput: string
): Promise<sql.ConnectionPool> {
  // Validar código numérico
  const code = validateEmpresaCode(empresaInput);
  const dbConfig = ERP_DATABASES[code];
  const erpDatabase = dbConfig.db;

  // Pool compartido por nombre de BD
  const existingPool = erpPools.get(erpDatabase);
  if (existingPool && existingPool.connected) {
    return existingPool;
  }

  // Limpiar pool desconectado
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
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
    },
  };

  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  erpPools.set(erpDatabase, pool);
  console.log(`[ERP] Connected to ${erpDatabase} at ${erpConfig.server} (empresa ${code})`);

  return pool;
}

/**
 * Obtiene la configuración de un tenant mediante su código numérico.
 */
export function getTenantConfig(empresaInput: string): {
  id: string;
  nombre: string;
  erpDatabase: string;
  codigoEmpresa: string;
  erpEmpresa: string;
} {
  const code = validateEmpresaCode(empresaInput);
  const config = ERP_DATABASES[code];
  return {
    id: code,
    nombre: config.nombre,
    erpDatabase: config.db,
    codigoEmpresa: code,
    erpEmpresa: config.empresa,
  };
}

/**
 * Obtiene todos los tenants disponibles (01-10)
 */
export function getAllTenants() {
  return Object.entries(ERP_DATABASES).map(([code, config]) => ({
    id: code,
    nombre: config.nombre,
    erpDatabase: config.db,
    codigoEmpresa: code,
    erpEmpresa: config.empresa,
  }));
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

    Object.entries(params).forEach(([key, value]) => {
      this.addParameter(request, key, value);
    });

    console.log('[PORTAL-QUERY]', queryString.substring(0, 100));
    return await request.query(queryString);
  }

  /**
   * Query al ERP (SELECT solamente - las escrituras van por SPs)
   */
  async queryERP(
    empresaInput: string,
    queryString: string,
    params: Record<string, any> = {}
  ): Promise<sql.IResult<any>> {
    const pool = await getERPConnection(empresaInput);
    const request = pool.request();

    Object.entries(params).forEach(([key, value]) => {
      this.addParameter(request, key, value);
    });

    console.log(`[ERP-QUERY][${empresaInput}]`, queryString.substring(0, 100));
    return await request.query(queryString);
  }

  /**
   * Query híbrida: combina datos del Portal y ERP
   */
  async queryHybrid(
    empresaInput: string,
    portalQuery: string,
    erpQuery: string,
    portalParams: Record<string, any> = {},
    erpParams: Record<string, any> = {}
  ): Promise<{ portal: sql.IResult<any>; erp: sql.IResult<any> }> {
    const [portalResult, erpResult] = await Promise.all([
      this.queryPortal(portalQuery, portalParams),
      this.queryERP(empresaInput, erpQuery, erpParams),
    ]);

    return { portal: portalResult, erp: erpResult };
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
    } else if (typeof value === 'number') {
      request.input(key, sql.Int, value);
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
