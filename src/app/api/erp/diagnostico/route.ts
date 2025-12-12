import { NextRequest, NextResponse } from 'next/server';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

/**
 * GET /api/erp/diagnostico
 * Lista TODAS las tablas disponibles en cada ERP
 * Útil para descubrir los nombres reales de las tablas
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

    if (empresa) {
      // Diagnosticar una empresa específica
      console.log(`\n🔍 Listando tablas en ${empresa}...`);
      const pool = await getERPConnection(empresa);

      const result = await pool.request().query(`
        SELECT
          TABLE_SCHEMA,
          TABLE_NAME,
          TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      return NextResponse.json({
        success: true,
        empresa,
        totalTablas: result.recordset.length,
        tablas: result.recordset,
      });
    } else {
      // Diagnosticar todas las empresas
      const empresas = ['la-cantera', 'peralillo', 'plaza-galerena', 'icrear'];
      const results: Record<string, any> = {};

      for (const emp of empresas) {
        try {
          console.log(`\n🔍 Listando tablas en ${emp}...`);
          const pool = await getERPConnection(emp);

          const result = await pool.request().query(`
            SELECT
              TABLE_SCHEMA,
              TABLE_NAME,
              TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
          `);

          results[emp] = {
            totalTablas: result.recordset.length,
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
        message: 'Diagnóstico completo de ERPs',
        results,
      });
    }
  } catch (error: any) {
    console.error('[API] Error en diagnóstico:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al diagnosticar ERPs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
