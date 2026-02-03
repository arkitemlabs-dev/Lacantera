/**
 * API Route: Lista de proveedores con órdenes de compra pendientes
 *
 * GET /api/admin/ordenes-sp/proveedores
 *
 * Retorna la lista única de proveedores que tienen órdenes pendientes
 * para usar en el filtro de autocompletado
 *
 * Query params:
 * - empresa: código de empresa (01, 02, etc.)
 * - busqueda: texto para filtrar proveedores (opcional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { storedProcedures } from '@/lib/database/stored-procedures';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';

export async function GET(request: NextRequest) {
  try {
    // Obtener la sesión del usuario para usar su empresa actual
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const empresaActual = session.user.empresaActual;
    if (!empresaActual) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Usar la empresa del parámetro si viene, o la de la sesión
    const empresaParam = searchParams.get('empresa');
    const empresa = empresaParam || getEmpresaERPFromTenant(empresaActual);

    if (!empresa) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la empresa' },
        { status: 400 }
      );
    }
    const busqueda = searchParams.get('busqueda')?.toLowerCase() || '';

    // Obtener todas las órdenes pendientes sin paginación para extraer proveedores únicos
    // Usamos un límite alto para obtener todos los proveedores
    const result = await storedProcedures.getOrdenesCompra({
      empresa,
      page: 1,
      limit: 10000, // Límite alto para obtener todos
    });

    // Extraer proveedores únicos
    const proveedoresMap = new Map<string, { codigo: string; nombre: string; rfc: string }>();

    result.ordenes.forEach((orden: any) => {
      if (orden.Proveedor && !proveedoresMap.has(orden.Proveedor)) {
        proveedoresMap.set(orden.Proveedor, {
          codigo: orden.Proveedor,
          nombre: orden.ProveedorNombre || orden.Proveedor,
          rfc: orden.ProveedorRFC || '',
        });
      }
    });

    // Convertir a array y ordenar
    let proveedores = Array.from(proveedoresMap.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Filtrar si hay búsqueda
    if (busqueda) {
      proveedores = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) ||
        p.codigo.toLowerCase().includes(busqueda) ||
        p.rfc.toLowerCase().includes(busqueda)
      );
    }

    return NextResponse.json({
      success: true,
      data: proveedores,
      total: proveedores.length
    });

  } catch (error) {
    console.error('Error en /api/admin/ordenes-sp/proveedores:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener lista de proveedores',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
