// src/app/api/admin/proveedores/[id]/route.ts
// API para gestión de proveedor individual (Admin)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  getProveedorConSP,
  erpAFormulario
} from '@/lib/database/admin-proveedores-queries';

/**
 * GET /api/admin/proveedores/[id]
 * Obtiene un proveedor específico usando el SP spDatosProveedor
 * El [id] puede ser:
 * - RFC: formato RFC válido
 * - Código: código de proveedor (numérico/alfanumérico)
 * - Nombre: nombre del proveedor (búsqueda parcial)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'la-cantera';
    const formato = searchParams.get('formato') || 'erp'; // 'erp' o 'form'

    const proveedorId = decodeURIComponent(params.id);

    console.log(`[API PROVEEDOR] Admin ${session.user.id} consultando proveedor: ${proveedorId}, empresa: ${empresa}`);

    // Determinar el tipo de búsqueda basado en el formato del ID
    let searchParams_obj: {
      empresa: string;
      rfc?: string;
      nombre?: string;
      codigo?: string;
    } = { empresa };

    // RFC: formato estándar mexicano
    if (/^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(proveedorId)) {
      searchParams_obj.rfc = proveedorId;
    }
    // Código numérico/alfanumérico corto
    else if (/^[A-Z0-9]+$/.test(proveedorId) && proveedorId.length <= 10) {
      searchParams_obj.codigo = proveedorId;
    }
    // Por defecto, buscar por nombre
    else {
      searchParams_obj.nombre = proveedorId;
    }

    const proveedor = await getProveedorConSP(searchParams_obj);

    if (!proveedor) {
      return NextResponse.json(
        {
          error: 'Proveedor no encontrado',
          criterio: Object.entries(searchParams_obj)
            .filter(([key, value]) => key !== 'empresa' && value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        },
        { status: 404 }
      );
    }

    // Retornar en el formato solicitado
    if (formato === 'form') {
      // Convertir datos ERP al formato de formulario para edición
      const formData = erpAFormulario(proveedor, empresa);
      return NextResponse.json({
        success: true,
        data: formData,
        formato: 'formulario'
      });
    }

    // Por defecto, retornar datos ERP completos
    return NextResponse.json({
      success: true,
      erpDatos: proveedor,
      formato: 'erp'
    });

  } catch (error: any) {
    console.error('[API PROVEEDOR] Error en GET:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/proveedores/[id]
 * Actualiza los datos de un proveedor usando el SP spDatosProveedor (operación 'M')
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const fs = await import('fs');
    const params = await props.params;
    const bodyData = await request.json();

    fs.appendFileSync('sp-debug.log', `\n>>> API POST RECEIVED ${new Date().toISOString()} <<<\nID: ${params.id}\nBody: ${JSON.stringify(bodyData, null, 2)}\n`);
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea administrador
    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresa = searchParams.get('empresa') || 'la-cantera';

    const proveedorId = decodeURIComponent(params.id);

    console.log(`[API PROVEEDOR POST] Admin ${session.user.id} actualizando proveedor: ${proveedorId}, empresa: ${empresa}`);

    // Preparar datos para el SP
    const dataToUpdate = {
      ...bodyData,
      empresa,
      operacion: 'M' as const,
      cveProv: proveedorId // Siempre usar el ID de la URL como identificador
    };

    // Si el ID de la URL parece un RFC, también asignarlo como criterio de búsqueda adicional
    if (/^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(proveedorId)) {
      dataToUpdate.rfc = proveedorId;
    }

    const { actualizarProveedorConSP } = await import('@/lib/database/admin-proveedores-queries');
    const result = await actualizarProveedorConSP(dataToUpdate);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Proveedor actualizado exitosamente en el ERP',
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Error al actualizar proveedor en el ERP',
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[API PROVEEDOR POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la actualización',
        details: error.message,
      },
      { status: 500 }
    );
  }
}