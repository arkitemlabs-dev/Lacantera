// src/app/api/admin/proveedores/route.ts
// API para gestión de proveedores (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getProveedoresConDatosERP } from '@/lib/database/admin-proveedores-queries';
import { 
  getProveedorConSP,
  crearProveedorConSP,
  actualizarProveedorConSP,
  validarDatosProveedor,
  erpAFormulario 
} from '@/lib/database/admin-proveedores-queries';
import type { FormProveedorAdmin } from '@/types/admin-proveedores';

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
    const busqueda = searchParams.get('q'); // Búsqueda por nombre/email/RFC
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');

    console.log(`[API PROVEEDORES] Admin ${session.user.id} solicitando proveedores`);
    console.log(`[API PROVEEDORES] Filtros: empresa=${empresaCode}, estatusPortal=${estatusPortal}, búsqueda=${busqueda}`);
    console.log(`[API PROVEEDORES] Nota: Solo se consultan proveedores con estatus ALTA (BAJA y BLOQUEADO excluidos)`);

    // Obtener proveedores (solo estatus ALTA, excluye BAJA y BLOQUEADO)
    const result = await getProveedoresConDatosERP({
      empresaCode: empresaCode || undefined,
      estatusPortal: estatusPortal || undefined,
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

/**
 * POST /api/admin/proveedores
 * Crea un nuevo proveedor usando el SP spDatosProveedor
 */
export async function POST(request: NextRequest) {
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

    // Obtener datos del proveedor del body
    const proveedorData: FormProveedorAdmin = await request.json();

    console.log(`[API PROVEEDORES] Admin ${session.user.id} creando proveedor: ${proveedorData.nombre}`);

    // Validar datos antes de enviar al SP
    const validacion = validarDatosProveedor(proveedorData);
    if (!validacion.valido) {
      return NextResponse.json(
        { 
          error: 'Datos de proveedor inválidos', 
          detalles: validacion.errores 
        },
        { status: 400 }
      );
    }

    // Crear proveedor usando el SP
    const result = await crearProveedorConSP(proveedorData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Proveedor creado exitosamente',
        data: result.data
      }, { status: 201 });
    } else {
      return NextResponse.json({
        error: 'Error al crear proveedor',
        detalles: result.error
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API PROVEEDORES] Error en POST:', error);
    return NextResponse.json(
      {
        error: 'Error interno al crear proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/proveedores
 * Actualiza un proveedor existente usando el SP spDatosProveedor
 */
export async function PUT(request: NextRequest) {
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

    // Obtener datos del proveedor del body
    const proveedorData: FormProveedorAdmin = await request.json();

    console.log(`[API PROVEEDORES] Admin ${session.user.id} actualizando proveedor: ${proveedorData.nombre}`);

    // Validar datos antes de enviar al SP
    const validacion = validarDatosProveedor(proveedorData);
    if (!validacion.valido) {
      return NextResponse.json(
        { 
          error: 'Datos de proveedor inválidos', 
          detalles: validacion.errores 
        },
        { status: 400 }
      );
    }

    // Actualizar proveedor usando el SP
    const result = await actualizarProveedorConSP(proveedorData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Proveedor actualizado exitosamente',
        data: result.data
      });
    } else {
      return NextResponse.json({
        error: 'Error al actualizar proveedor',
        detalles: result.error
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API PROVEEDORES] Error en PUT:', error);
    return NextResponse.json(
      {
        error: 'Error interno al actualizar proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}