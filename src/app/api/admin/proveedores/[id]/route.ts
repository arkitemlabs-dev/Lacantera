// src/app/api/admin/proveedores/[id]/route.ts
// API para obtener detalles completos de un proveedor específico

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getProveedorCompleto, getProveedorPorRFC, getProveedorPorID, getProveedorPorNombreORFC, getProveedorPorCodigoERP } from '@/lib/database/admin-proveedores-queries';

/**
 * GET /api/admin/proveedores/[id]
 * Obtiene los detalles completos de un proveedor específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de proveedor requerido' },
        { status: 400 }
      );
    }

    console.log(`[API PROVEEDOR DETALLE] Admin ${session.user.id} solicitando detalles del proveedor ${id}`);

    // Determinar tipo de búsqueda por prioridad
    let proveedor;
    
    // 1. Si es código ERP (formato P00XXX)
    if (id.match(/^P\d{5}$/)) {
      proveedor = await getProveedorPorCodigoERP(id);
    }
    // 2. Si es ID numérico
    else if (!isNaN(Number(id))) {
      proveedor = await getProveedorPorID(id);
    }
    // 3. Intentar búsqueda flexible
    else {
      try {
        proveedor = await getProveedorPorNombreORFC(id);
      } catch (error) {
        // Último recurso: búsqueda original
        proveedor = await getProveedorCompleto(id);
      }
    }

    return NextResponse.json(proveedor, { status: 200 });

  } catch (error: any) {
    console.error('[API PROVEEDOR DETALLE] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener detalles del proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}