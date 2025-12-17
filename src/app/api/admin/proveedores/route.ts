// src/app/api/admin/proveedores/route.ts
// API para gestión de proveedores (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getProveedoresConDatosERP } from '@/lib/database/admin-proveedores-queries';

/**
 * GET /api/admin/proveedores
 * Lista todos los proveedores con datos del portal y ERP
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

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const empresaCode = searchParams.get('empresa'); // Filtro por empresa
    const estatusPortal = searchParams.get('estatusPortal'); // ACTIVO/INACTIVO/PENDIENTE
    const estatusERP = searchParams.get('estatusERP'); // ALTA/BAJA/BLOQUEADO
    const busqueda = searchParams.get('q'); // Búsqueda por nombre/email/RFC
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`[API PROVEEDORES] Admin ${session.user.id} solicitando proveedores`);
    console.log(`[API PROVEEDORES] Filtros: empresa=${empresaCode}, estatusPortal=${estatusPortal}, estatusERP=${estatusERP}, búsqueda=${busqueda}`);

    // Obtener proveedores
    const result = await getProveedoresConDatosERP({
      empresaCode: empresaCode || undefined,
      estatusPortal: estatusPortal || undefined,
      estatusERP: estatusERP || undefined,
      busqueda: busqueda || undefined,
      page,
      limit,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('[API PROVEEDORES] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener proveedores',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
