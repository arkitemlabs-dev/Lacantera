/**
 * Servicio de Sincronización Automática de Proveedores
 *
 * Busca al proveedor en todos los ERPs por RFC y crea mappings automáticamente
 */

import { getPortalConnection, getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

export interface SyncResult {
  success: boolean;
  empresasEncontradas: string[];
  mappingsCreados: number;
  detalles: Array<{
    empresa: string;
    codigoProveedor: string;
    nombre: string;
    rfc: string;
  }>;
  errores: string[];
}

/**
 * Sincroniza automáticamente un proveedor buscando por RFC en todos los ERPs
 */
export async function autoSyncProveedorByRFC(
  portalUserId: string,
  rfc: string
): Promise<SyncResult> {
  console.log(`🔄 [AutoSync] Sincronizando proveedor RFC: ${rfc}, Usuario: ${portalUserId}`);

  const empresas = [
    'la-cantera',
    'peralillo',
    'plaza-galerena',
    'inmobiliaria-galerena',
    'icrear'
  ];

  const result: SyncResult = {
    success: false,
    empresasEncontradas: [],
    mappingsCreados: 0,
    detalles: [],
    errores: []
  };

  try {
    const portalPool = await getPortalConnection();

    // Buscar en cada ERP
    for (const empresa of empresas) {
      try {
        console.log(`🔍 Buscando en ${empresa}...`);
        const pool = await getERPConnection(empresa);

        // Buscar proveedor por RFC en tabla Prov
        const provResult = await pool.request()
          .input('rfc', sql.VarChar(15), rfc)
          .query(`
            SELECT TOP 1
              Proveedor AS Codigo,
              Nombre,
              RFC,
              Estatus
            FROM Prov
            WHERE RFC = @rfc
          `);

        if (provResult.recordset && provResult.recordset.length > 0) {
          const proveedor = provResult.recordset[0];
          console.log(`✅ ${empresa}: Encontrado como ${proveedor.Codigo}`);

          // Verificar si el mapping ya existe
          const existingMapping = await portalPool.request()
            .input('userId', sql.NVarChar(50), portalUserId)
            .input('proveedorCode', sql.VarChar(20), proveedor.Codigo)
            .input('empresaCode', sql.VarChar(50), empresa)
            .query(`
              SELECT id
              FROM portal_proveedor_mapping
              WHERE portal_user_id = @userId
                AND erp_proveedor_code = @proveedorCode
                AND empresa_code = @empresaCode
            `);

          if (existingMapping.recordset && existingMapping.recordset.length > 0) {
            console.log(`⚠️ ${empresa}: Mapping ya existe, omitiendo`);
            result.empresasEncontradas.push(empresa);
            result.detalles.push({
              empresa,
              codigoProveedor: proveedor.Codigo,
              nombre: proveedor.Nombre,
              rfc: proveedor.RFC
            });
            continue;
          }

          // Crear mapping
          await portalPool.request()
            .input('userId', sql.NVarChar(50), portalUserId)
            .input('proveedorCode', sql.VarChar(20), proveedor.Codigo)
            .input('empresaCode', sql.VarChar(50), empresa)
            .query(`
              INSERT INTO portal_proveedor_mapping (
                id,
                portal_user_id,
                erp_proveedor_code,
                empresa_code,
                permisos,
                activo,
                created_at
              ) VALUES (
                NEWID(),
                @userId,
                @proveedorCode,
                @empresaCode,
                NULL,
                1,
                GETDATE()
              )
            `);

          console.log(`✅ ${empresa}: Mapping creado`);

          result.empresasEncontradas.push(empresa);
          result.mappingsCreados++;
          result.detalles.push({
            empresa,
            codigoProveedor: proveedor.Codigo,
            nombre: proveedor.Nombre,
            rfc: proveedor.RFC
          });
        } else {
          console.log(`ℹ️ ${empresa}: No encontrado`);
        }

      } catch (error: any) {
        console.error(`❌ Error en ${empresa}:`, error.message);
        result.errores.push(`${empresa}: ${error.message}`);
      }
    }

    result.success = result.mappingsCreados > 0 || result.empresasEncontradas.length > 0;

    console.log(`✅ [AutoSync] Completado: ${result.mappingsCreados} mappings creados en ${result.empresasEncontradas.length} empresas`);

    return result;

  } catch (error: any) {
    console.error('❌ [AutoSync] Error general:', error);
    result.errores.push(`Error general: ${error.message}`);
    return result;
  }
}

/**
 * Obtiene las empresas disponibles para un proveedor
 */
export async function getEmpresasDisponibles(portalUserId: string): Promise<Array<{
  code: string;
  nombre: string;
  codigoProveedor: string;
}>> {
  try {
    const portalPool = await getPortalConnection();

    const mappingsResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), portalUserId)
      .query(`
        SELECT
          empresa_code,
          erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND activo = 1
        ORDER BY empresa_code
      `);

    const empresas = mappingsResult.recordset.map(mapping => ({
      code: mapping.empresa_code,
      nombre: mapping.empresa_code === 'la-cantera' ? 'La Cantera' :
              mapping.empresa_code === 'peralillo' ? 'Peralillo' :
              mapping.empresa_code === 'plaza-galerena' ? 'Plaza Galereña' :
              mapping.empresa_code === 'inmobiliaria-galerena' ? 'Inmobiliaria Galereña' :
              mapping.empresa_code === 'icrear' ? 'Icrear' : mapping.empresa_code,
      codigoProveedor: mapping.erp_proveedor_code
    }));

    console.log(`✅ ${empresas.length} empresas disponibles para usuario ${portalUserId}`);

    return empresas;

  } catch (error: any) {
    console.error('❌ Error obteniendo empresas disponibles:', error);
    return [];
  }
}

/**
 * Sincroniza TODOS los proveedores del portal que aún no tienen mappings
 * Útil para migración inicial
 */
export async function syncAllProveedores(): Promise<{
  total: number;
  sincronizados: number;
  errores: string[];
}> {
  console.log('🔄 [AutoSync] Sincronizando TODOS los proveedores...');

  const resultado = {
    total: 0,
    sincronizados: 0,
    errores: [] as string[]
  };

  try {
    const portalPool = await getPortalConnection();

    // Obtener todos los proveedores (usuarios tipo 4) que no tienen mappings
    const proveedoresResult = await portalPool.request().query(`
      SELECT DISTINCT
        u.IDUsuario,
        u.Usuario,
        p.RFC
      FROM pNetUsuario u
      INNER JOIN Prov p ON u.Usuario = p.Proveedor
      WHERE u.IDUsuarioTipo = 4
        AND u.Estatus = 'ACTIVO'
        AND p.RFC IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM portal_proveedor_mapping m
          WHERE m.portal_user_id = CAST(u.IDUsuario AS NVARCHAR(50))
        )
    `);

    resultado.total = proveedoresResult.recordset.length;
    console.log(`📊 Total de proveedores sin mappings: ${resultado.total}`);

    for (const proveedor of proveedoresResult.recordset) {
      try {
        const syncResult = await autoSyncProveedorByRFC(
          String(proveedor.IDUsuario),
          proveedor.RFC
        );

        if (syncResult.success) {
          resultado.sincronizados++;
          console.log(`✅ ${proveedor.Usuario} (${proveedor.RFC}): ${syncResult.mappingsCreados} mappings`);
        } else {
          console.log(`⚠️ ${proveedor.Usuario} (${proveedor.RFC}): No se encontró en ningún ERP`);
        }

        if (syncResult.errores.length > 0) {
          resultado.errores.push(...syncResult.errores);
        }

      } catch (error: any) {
        resultado.errores.push(`${proveedor.Usuario}: ${error.message}`);
      }
    }

    console.log(`✅ [AutoSync] Sincronización masiva completada: ${resultado.sincronizados}/${resultado.total}`);

    return resultado;

  } catch (error: any) {
    console.error('❌ [AutoSync] Error en sincronización masiva:', error);
    resultado.errores.push(`Error general: ${error.message}`);
    return resultado;
  }
}
