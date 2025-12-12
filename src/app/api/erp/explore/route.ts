import { NextRequest, NextResponse } from 'next/server';
import { erpExplorer } from '@/lib/database/erp-explorer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';

/**
 * GET /api/erp/explore
 * Explora la estructura de los ERPs automáticamente
 *
 * Query params:
 * - empresa?: string (la-cantera, peralillo, plaza-galerena, icrear)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación (solo administradores)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // if (session.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { error: 'Solo administradores pueden explorar ERPs' },
    //     { status: 403 }
    //   );
    // }

    const searchParams = request.nextUrl.searchParams;
    const empresa = searchParams.get('empresa');

    if (empresa) {
      // Explorar una empresa específica
      console.log(`\n🔍 Explorando ERP: ${empresa}...`);
      const structure = await erpExplorer.discoverERPStructure(empresa);

      return NextResponse.json({
        success: true,
        empresa,
        structure,
        message: 'Exploración completada para ' + empresa,
      });
    } else {
      // Explorar todas las empresas
      console.log(`\n🔍 Explorando todos los ERPs...`);
      const empresas = ['la-cantera', 'peralillo', 'plaza-galerena', 'icrear'];
      const results: Record<string, any> = {};

      for (const emp of empresas) {
        try {
          results[emp] = await erpExplorer.discoverERPStructure(emp);
        } catch (error: any) {
          results[emp] = {
            error: error.message,
            status: 'failed',
          };
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Exploración completa de ERPs',
        results,
      });
    }
  } catch (error: any) {
    console.error('[API] Error explorando ERPs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al explorar ERPs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
