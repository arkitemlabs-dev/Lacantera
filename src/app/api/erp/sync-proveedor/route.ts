import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * POST /api/erp/sync-proveedor
 * Sincroniza un proveedor específico desde los ERPs al Portal
 *
 * Este endpoint busca un proveedor por patrón de búsqueda en todas las empresas
 * y crea los mappings necesarios en portal_proveedor_mapping
 *
 * Body:
 * {
 *   patron: string  // Patrón de búsqueda (nombre, RFC, código)
 *   userId?: string // Usuario del portal (opcional, usa el de la sesión si no se especifica)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patron, userId } = body;

    if (!patron) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "patron"' },
        { status: 400 }
      );
    }

    const portalUserId = userId || session.user.id;
    const empresas = ['la-cantera', 'peralillo', 'plaza-galerena', 'inmobiliaria-galerena', 'icrear'];
    const syncResults: Record<string, any> = {};
    const portalPool = await getPortalConnection();

    console.log(`\n🔄 Iniciando sincronización de proveedor con patrón "${patron}"...`);

    for (const empresa of empresas) {
      try {
        console.log(`\n📍 Procesando empresa: ${empresa}...`);
        const pool = await getERPConnection(empresa);

        // Buscar proveedor en la tabla Prov
        const result = await pool.request().query(`
          SELECT TOP 1 *
          FROM Prov
          WHERE Proveedor LIKE '%${patron}%'
             OR Nombre LIKE '%${patron}%'
             OR RFC LIKE '%${patron}%'
          ORDER BY Nombre
        `);

        if (result.recordset.length === 0) {
          syncResults[empresa] = {
            success: false,
            message: `No se encontró proveedor con patrón "${patron}"`,
          };
          continue;
        }

        const proveedor = result.recordset[0];
        const proveedorCodigo = proveedor.Proveedor;
        const proveedorNombre = proveedor.Nombre;
        const proveedorRFC = proveedor.RFC;

        console.log(`✅ Proveedor encontrado: ${proveedorCodigo} - ${proveedorNombre}`);

        // Verificar si ya existe el mapping en el portal
        const checkResult = await portalPool.request()
          .input('portalUserId', sql.NVarChar(50), portalUserId)
          .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
          .input('empresaCode', sql.VarChar(50), empresa)
          .query(`
            SELECT *
            FROM portal_proveedor_mapping
            WHERE portal_user_id = @portalUserId
              AND erp_proveedor_code = @proveedorCode
              AND empresa_code = @empresaCode
          `);

        const existe = checkResult.recordset.length > 0;

        if (existe) {
          // Actualizar fecha de última modificación
          await portalPool.request()
            .input('portalUserId', sql.NVarChar(50), portalUserId)
            .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
            .input('empresaCode', sql.VarChar(50), empresa)
            .query(`
              UPDATE portal_proveedor_mapping
              SET updated_at = GETDATE()
              WHERE portal_user_id = @portalUserId
                AND erp_proveedor_code = @proveedorCode
                AND empresa_code = @empresaCode
            `);

          syncResults[empresa] = {
            success: true,
            action: 'updated',
            proveedor: {
              codigo: proveedorCodigo,
              nombre: proveedorNombre,
              rfc: proveedorRFC,
            },
            message: 'Mapping actualizado exitosamente',
          };

          console.log(`♻️  Mapping actualizado para ${proveedorCodigo} en ${empresa}`);
        } else {
          // Crear nuevo mapping (usar NEWID() de SQL Server directamente)
          await portalPool.request()
            .input('portalUserId', sql.NVarChar(50), portalUserId)
            .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
            .input('empresaCode', sql.VarChar(50), empresa)
            .input('permisos', sql.NVarChar(sql.MAX), JSON.stringify({
              ver_ordenes: true,
              subir_facturas: true,
              ver_pagos: true,
              descargar_reportes: true,
            }))
            .input('activo', sql.Bit, true)
            .query(`
              INSERT INTO portal_proveedor_mapping (
                id,
                portal_user_id,
                erp_proveedor_code,
                empresa_code,
                permisos,
                activo,
                created_at,
                updated_at
              ) VALUES (
                NEWID(),
                @portalUserId,
                @proveedorCode,
                @empresaCode,
                @permisos,
                @activo,
                GETDATE(),
                GETDATE()
              )
            `);

          syncResults[empresa] = {
            success: true,
            action: 'created',
            proveedor: {
              codigo: proveedorCodigo,
              nombre: proveedorNombre,
              rfc: proveedorRFC,
            },
            message: 'Mapping creado exitosamente',
          };

          console.log(`✨ Mapping creado para ${proveedorCodigo} en ${empresa}`);
        }

      } catch (error: any) {
        console.error(`❌ Error procesando ${empresa}:`, error.message);
        syncResults[empresa] = {
          success: false,
          error: error.message,
        };
      }
    }

    // Verificar si al menos uno fue exitoso
    const algunoExitoso = Object.values(syncResults).some((r: any) => r.success);

    return NextResponse.json({
      success: algunoExitoso,
      patron,
      portalUserId,
      message: algunoExitoso
        ? 'Sincronización completada con éxito en al menos una empresa'
        : 'No se pudo sincronizar el proveedor en ninguna empresa',
      results: syncResults,
    });

  } catch (error: any) {
    console.error('[API] Error en sincronización:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al sincronizar proveedor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/erp/sync-proveedor
 * Obtiene los mappings de un proveedor
 *
 * Query params:
 * - userId?: string (opcional, usa el de la sesión si no se especifica)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || session.user.id;

    const portalPool = await getPortalConnection();

    const result = await portalPool.request()
      .input('portalUserId', sql.NVarChar(50), userId)
      .query(`
        SELECT *
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @portalUserId
          AND activo = 1
        ORDER BY empresa_code, erp_proveedor_code
      `);

    return NextResponse.json({
      success: true,
      userId,
      totalMappings: result.recordset.length,
      mappings: result.recordset,
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo mappings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener mappings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
