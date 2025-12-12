import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

/**
 * GET /api/erp/buscar-por-rfc
 * Busca proveedores por RFC exacto o patrón en todas las empresas
 *
 * Query params:
 * - rfc: string (RFC completo o parcial del proveedor)
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
    const rfc = searchParams.get('rfc');

    if (!rfc) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "rfc"' },
        { status: 400 }
      );
    }

    const empresas = ['la-cantera', 'peralillo', 'plaza-galerena'];
    const results: Record<string, any> = {};

    console.log(`\n🔍 Buscando proveedores con RFC "${rfc}" en todas las empresas...`);

    for (const empresa of empresas) {
      try {
        console.log(`\n📍 Buscando en ${empresa}...`);
        const pool = await getERPConnection(empresa);

        // Buscar por RFC exacto o parcial
        const result = await pool.request().query(`
          SELECT
            Proveedor AS Codigo,
            Nombre,
            RFC,
            Estatus,
            eMail1 AS Email,
            Telefonos,
            Direccion,
            Colonia,
            Poblacion AS Ciudad,
            Estado,
            CodigoPostal AS CP
          FROM Prov
          WHERE RFC LIKE '%${rfc.toUpperCase()}%'
             OR RFC = '${rfc.toUpperCase()}'
          ORDER BY Nombre
        `);

        if (result.recordset.length > 0) {
          results[empresa] = {
            success: true,
            totalEncontrados: result.recordset.length,
            proveedores: result.recordset,
          };
          console.log(`✅ Encontrados ${result.recordset.length} proveedores en ${empresa}`);
        } else {
          results[empresa] = {
            success: false,
            totalEncontrados: 0,
            message: `No se encontró RFC "${rfc}" en ${empresa}`,
          };
          console.log(`⚠️  No se encontró RFC en ${empresa}`);
        }

      } catch (error: any) {
        console.error(`❌ Error en ${empresa}:`, error.message);
        results[empresa] = {
          success: false,
          error: error.message,
        };
      }
    }

    // Contar cuántas empresas encontraron el proveedor
    const empresasConResultados = Object.values(results).filter((r: any) => r.success && r.totalEncontrados > 0).length;

    return NextResponse.json({
      success: empresasConResultados > 0,
      rfc,
      empresasEncontradas: empresasConResultados,
      totalEmpresas: empresas.length,
      message: empresasConResultados > 0
        ? `Proveedor encontrado en ${empresasConResultados} empresa(s)`
        : `No se encontró el RFC "${rfc}" en ninguna empresa`,
      results,
    });

  } catch (error: any) {
    console.error('[API] Error buscando por RFC:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al buscar por RFC',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
