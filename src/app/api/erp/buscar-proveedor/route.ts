import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

/**
 * GET /api/erp/buscar-proveedor
 * Busca proveedores por patrón de nombre en la tabla Prov
 *
 * Query params:
 * - empresa: string (la-cantera, peralillo, plaza-galerena, icrear)
 * - patron: string (patrón de búsqueda, ej: "ARK", "ARKITEM")
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
    const patron = searchParams.get('patron');

    if (!patron) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro "patron"' },
        { status: 400 }
      );
    }

    if (empresa) {
      // Buscar en una empresa específica
      console.log(`\n🔍 Buscando proveedores con patrón "${patron}" en ${empresa}...`);
      const pool = await getERPConnection(empresa);

      // Buscar en la tabla Prov
      const result = await pool.request().query(`
        SELECT TOP 20 *
        FROM Prov
        WHERE Proveedor LIKE '%${patron}%'
           OR Nombre LIKE '%${patron}%'
           OR RFC LIKE '%${patron}%'
        ORDER BY Nombre
      `);

      return NextResponse.json({
        success: true,
        empresa,
        patron,
        totalEncontrados: result.recordset.length,
        proveedores: result.recordset,
      });
    } else {
      // Buscar en todas las empresas
      const empresas = ['la-cantera', 'peralillo', 'plaza-galerena'];
      const results: Record<string, any> = {};

      for (const emp of empresas) {
        try {
          console.log(`\n🔍 Buscando proveedores con patrón "${patron}" en ${emp}...`);
          const pool = await getERPConnection(emp);

          const result = await pool.request().query(`
            SELECT TOP 20 *
            FROM Prov
            WHERE Proveedor LIKE '%${patron}%'
               OR Nombre LIKE '%${patron}%'
               OR RFC LIKE '%${patron}%'
            ORDER BY Nombre
          `);

          results[emp] = {
            totalEncontrados: result.recordset.length,
            proveedores: result.recordset,
          };
        } catch (error: any) {
          results[emp] = {
            error: error.message,
          };
        }
      }

      return NextResponse.json({
        success: true,
        patron,
        message: `Búsqueda de proveedores con patrón "${patron}"`,
        results,
      });
    }
  } catch (error: any) {
    console.error('[API] Error buscando proveedores:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al buscar proveedores',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
