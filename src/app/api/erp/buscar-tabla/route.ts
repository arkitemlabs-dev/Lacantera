import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

/**
 * GET /api/erp/buscar-tabla
 * Busca tablas por patrón de nombre en los ERPs
 *
 * Query params:
 * - empresa?: string (la-cantera, peralillo, plaza-galerena, icrear)
 * - patron: string (patrón de búsqueda, ej: "prov", "compra", "orden")
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
      console.log(`\n🔍 Buscando tablas con patrón "${patron}" en ${empresa}...`);
      const pool = await getERPConnection(empresa);

      const result = await pool.request().query(`
        SELECT
          TABLE_SCHEMA,
          TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME LIKE '%${patron}%'
        ORDER BY TABLE_NAME
      `);

      return NextResponse.json({
        success: true,
        empresa,
        patron,
        totalEncontradas: result.recordset.length,
        tablas: result.recordset,
      });
    } else {
      // Buscar en todas las empresas
      const empresas = ['la-cantera', 'peralillo', 'plaza-galerena', 'icrear'];
      const results: Record<string, any> = {};

      for (const emp of empresas) {
        try {
          console.log(`\n🔍 Buscando tablas con patrón "${patron}" en ${emp}...`);
          const pool = await getERPConnection(emp);

          const result = await pool.request().query(`
            SELECT
              TABLE_SCHEMA,
              TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
              AND TABLE_NAME LIKE '%${patron}%'
            ORDER BY TABLE_NAME
          `);

          results[emp] = {
            totalEncontradas: result.recordset.length,
            tablas: result.recordset.map((t: any) => t.TABLE_NAME),
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
        message: `Búsqueda de tablas con patrón "${patron}"`,
        results,
      });
    }
  } catch (error: any) {
    console.error('[API] Error buscando tablas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al buscar tablas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
