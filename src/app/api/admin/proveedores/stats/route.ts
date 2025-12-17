// src/app/api/admin/proveedores/stats/route.ts
// Estadísticas de proveedores

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getProveedoresStats } from '@/lib/database/admin-proveedores-queries';

/**
 * GET /api/admin/proveedores/stats
 * Obtiene estadísticas de proveedores
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea administrador
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    console.log(`[API PROVEEDORES STATS] Admin ${session.user.id} solicitando estadísticas`);

    // Obtener estadísticas
    const stats = await getProveedoresStats();

    return NextResponse.json(stats, { status: 200 });

  } catch (error: any) {
    console.error('[API PROVEEDORES STATS] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener estadísticas',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
