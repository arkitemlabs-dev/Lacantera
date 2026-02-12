import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getTodasLasEmpresas } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * GET /api/erp/buscar-por-rfc
 * Busca proveedores por RFC exacto o patrón en todas las empresas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rfc = searchParams.get('rfc');

    if (!rfc) {
      return NextResponse.json({ error: 'Se requiere el parámetro "rfc"' }, { status: 400 });
    }

    const empresas = getTodasLasEmpresas();
    const results: Record<string, any> = {};

    console.log(`\n🔍 Buscando proveedores con RFC "${rfc}" en todas las empresas (01-10)...`);

    for (const empresa of empresas) {
      try {
        console.log(`\n📍 Buscando en ${empresa.nombre} (${empresa.code})...`);
        const pool = await getERPConnection(empresa.code);

        const result = await pool.request()
          .input('rfc', sql.VarChar(15), `%${rfc.toUpperCase()}%`)
          .input('rfcExact', sql.VarChar(15), rfc.toUpperCase())
          .query(`
            SELECT
              Proveedor AS Codigo,
              Nombre,
              RFC,
              Estatus,
              eMail1 AS Email,
              Telefonos
            FROM Prov
            WHERE RFC LIKE @rfc OR RFC = @rfcExact
            ORDER BY Nombre
          `);

        results[empresa.code] = {
          success: result.recordset.length > 0,
          nombreEmpresa: empresa.nombre,
          totalEncontrados: result.recordset.length,
          proveedores: result.recordset,
        };

      } catch (error: any) {
        console.error(`❌ Error en ${empresa.code}:`, error.message);
        results[empresa.code] = {
          success: false,
          error: error.message,
        };
      }
    }

    const empresasConResultados = Object.values(results).filter((r: any) => r.success).length;

    return NextResponse.json({
      success: empresasConResultados > 0,
      rfc,
      empresasEncontradas: empresasConResultados,
      totalEmpresas: empresas.length,
      results,
    });

  } catch (error: any) {
    console.error('[API] Error buscando por RFC:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar por RFC' },
      { status: 500 }
    );
  }
}
