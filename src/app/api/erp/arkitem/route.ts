import { NextRequest, NextResponse } from 'next/server';
import { erpExplorer } from '@/lib/database/erp-explorer';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

/**
 * GET /api/erp/arkitem
 * Busca y sincroniza el proveedor Arkitem desde los ERPs
 *
 * Query params:
 * - empresa?: string (la-cantera, peralillo, plaza-galerena, icrear)
 * - search?: string (término de búsqueda, default: "ARKITEM")
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
    const empresa = searchParams.get('empresa');
    const searchTerm = searchParams.get('search') || 'ARKITEM';

    if (!empresa) {
      // Buscar en todas las empresas
      const empresas = ['la-cantera', 'peralillo', 'plaza-galerena', 'icrear'];
      const results: Record<string, any> = {};

      for (const emp of empresas) {
        try {
          console.log(`\n🔍 Buscando ${searchTerm} en ${emp}...`);

          // 1. Explorar estructura
          const structure = await erpExplorer.discoverERPStructure(emp);

          if (!structure.proveedores) {
            results[emp] = {
              found: false,
              message: 'No se encontró tabla de proveedores',
            };
            continue;
          }

          // 2. Buscar Arkitem
          const proveedores = await erpExplorer.findProveedorInERP(
            emp,
            searchTerm,
            structure.proveedores
          );

          if (proveedores.length > 0) {
            const proveedor = proveedores[0];
            const { fieldMapping } = structure.proveedores;

            results[emp] = {
              found: true,
              proveedor: {
                codigo: proveedor[fieldMapping.codigo || ''],
                nombre: proveedor[fieldMapping.nombre || ''],
                rfc: proveedor[fieldMapping.rfc || ''],
                email: proveedor[fieldMapping.email || ''],
                telefono: proveedor[fieldMapping.telefono || ''],
                direccion: proveedor[fieldMapping.direccion || ''],
                raw: proveedor,
              },
              fieldMapping,
              tableName: structure.proveedores.tableName,
            };

            // 3. Buscar órdenes si existe estructura
            if (structure.ordenes && fieldMapping.codigo) {
              try {
                const ordenes = await erpExplorer.getOrdenesProveedor(
                  emp,
                  proveedor[fieldMapping.codigo],
                  structure.ordenes,
                  10
                );

                results[emp].ordenes = {
                  count: ordenes.length,
                  data: ordenes.slice(0, 3), // Solo primeras 3 para ejemplo
                };
              } catch (error) {
                results[emp].ordenes = { error: 'No se pudieron obtener órdenes' };
              }
            }
          } else {
            results[emp] = {
              found: false,
              message: `No se encontró ${searchTerm} en ${emp}`,
            };
          }
        } catch (error: any) {
          results[emp] = {
            found: false,
            error: error.message,
          };
        }
      }

      return NextResponse.json({
        success: true,
        searchTerm,
        results,
      });
    } else {
      // Buscar en una empresa específica
      console.log(`\n🔍 Buscando ${searchTerm} en ${empresa}...`);

      const structure = await erpExplorer.discoverERPStructure(empresa);

      if (!structure.proveedores) {
        return NextResponse.json({
          success: false,
          error: 'No se encontró tabla de proveedores en el ERP',
        }, { status: 404 });
      }

      const proveedores = await erpExplorer.findProveedorInERP(
        empresa,
        searchTerm,
        structure.proveedores
      );

      if (proveedores.length === 0) {
        return NextResponse.json({
          success: false,
          message: `No se encontró ${searchTerm} en ${empresa}`,
        }, { status: 404 });
      }

      const proveedor = proveedores[0];
      const { fieldMapping } = structure.proveedores;

      const result: any = {
        found: true,
        empresa,
        proveedor: {
          codigo: proveedor[fieldMapping.codigo || ''],
          nombre: proveedor[fieldMapping.nombre || ''],
          rfc: proveedor[fieldMapping.rfc || ''],
          email: proveedor[fieldMapping.email || ''],
          telefono: proveedor[fieldMapping.telefono || ''],
          direccion: proveedor[fieldMapping.direccion || ''],
          raw: proveedor,
        },
        fieldMapping,
        tableName: structure.proveedores.tableName,
      };

      // Buscar órdenes
      if (structure.ordenes && fieldMapping.codigo) {
        try {
          const ordenes = await erpExplorer.getOrdenesProveedor(
            empresa,
            proveedor[fieldMapping.codigo],
            structure.ordenes,
            10
          );

          result.ordenes = {
            count: ordenes.length,
            data: ordenes,
            fieldMapping: structure.ordenes.fieldMapping,
          };
        } catch (error) {
          result.ordenes = { error: 'No se pudieron obtener órdenes' };
        }
      }

      return NextResponse.json({
        success: true,
        searchTerm,
        result,
      });
    }
  } catch (error: any) {
    console.error('[API] Error buscando en ERP:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al buscar en ERP',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/erp/arkitem
 * Sincroniza Arkitem desde ERP al Portal PP
 *
 * Body:
 * {
 *   empresa: string,  // Opcional - si no se especifica, sincroniza en todas
 *   searchTerm?: string  // Opcional - default: "ARKITEM"
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
    const { empresa, searchTerm = 'ARKITEM' } = body;

    const empresas = empresa ? [empresa] : ['la-cantera', 'peralillo', 'plaza-galerena', 'icrear'];
    const syncResults: Record<string, any> = {};

    for (const emp of empresas) {
      try {
        console.log(`\n🔄 Sincronizando ${searchTerm} en ${emp}...`);

        // 1. Explorar estructura
        const structure = await erpExplorer.discoverERPStructure(emp);

        if (!structure.proveedores) {
          syncResults[emp] = {
            success: false,
            message: 'No se encontró tabla de proveedores',
          };
          continue;
        }

        // 2. Buscar proveedor
        const proveedores = await erpExplorer.findProveedorInERP(
          emp,
          searchTerm,
          structure.proveedores
        );

        if (proveedores.length === 0) {
          syncResults[emp] = {
            success: false,
            message: `No se encontró ${searchTerm}`,
          };
          continue;
        }

        const proveedor = proveedores[0];
        const { fieldMapping } = structure.proveedores;

        // 3. Sincronizar a Portal PP (usando tabla portal_proveedor_mapping)
        const portalPool = await getPortalConnection();
        const proveedorCodigo = proveedor[fieldMapping.codigo || ''];

        // Verificar si ya existe el mapping
        const existeResult = await portalPool.request()
          .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
          .input('empresaCode', sql.VarChar(10), emp)
          .query(`
            SELECT COUNT(*) as count
            FROM portal_proveedor_mapping
            WHERE erp_proveedor_code = @proveedorCode
              AND empresa_code = @empresaCode
          `);

        const existe = existeResult.recordset[0].count > 0;

        if (!existe) {
          // Crear mapping nuevo (necesita un portal_user_id, por ahora usamos el del usuario actual)
          await portalPool.request()
            .input('id', sql.UniqueIdentifier, sql.newGuid())
            .input('portalUserId', sql.VarChar(50), session.user.id)
            .input('proveedorCode', sql.VarChar(20), proveedorCodigo)
            .input('empresaCode', sql.VarChar(10), emp)
            .input('permisos', sql.NVarChar(sql.MAX), JSON.stringify(['ver_ordenes', 'subir_facturas']))
            .input('activo', sql.Bit, true)
            .query(`
              INSERT INTO portal_proveedor_mapping (
                id, portal_user_id, erp_proveedor_code, empresa_code,
                permisos, activo, created_at, updated_at
              ) VALUES (
                @id, @portalUserId, @proveedorCode, @empresaCode,
                @permisos, @activo, GETDATE(), GETDATE()
              )
            `);
        }

        syncResults[emp] = {
          success: true,
          action: existe ? 'updated' : 'created',
          proveedor: {
            codigo: proveedorCodigo,
            nombre: proveedor[fieldMapping.nombre || ''],
            rfc: proveedor[fieldMapping.rfc || ''],
          },
          message: `Proveedor ${existe ? 'actualizado' : 'creado'} exitosamente`,
        };

      } catch (error: any) {
        syncResults[emp] = {
          success: false,
          error: error.message,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      results: syncResults,
    });

  } catch (error: any) {
    console.error('[API] Error sincronizando:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al sincronizar',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
