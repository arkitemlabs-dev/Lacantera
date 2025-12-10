import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { extendedDb } from '@/lib/database/sqlserver-extended';
import { audit } from '@/lib/helpers/audit';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/proveedores/documentos
 * Obtener documentos del proveedor para la empresa actual
 *
 * Query params:
 * - proveedor: string (opcional - si no se proporciona, usa el del tenant)
 */
export const GET = withTenantContext(async (request, { tenant, user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Usar el proveedor del query param o el del tenant
    const proveedorParam = searchParams.get('proveedor');
    const proveedor = proveedorParam || tenant.proveedorCodigo;

    if (!proveedor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no está mapeado a un proveedor'
        },
        { status: 400 }
      );
    }

    // Validar que si se proporciona un proveedor diferente, el usuario tenga permisos
    if (proveedorParam && proveedorParam !== tenant.proveedorCodigo && user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'No tiene permisos para ver documentos de otro proveedor'
        },
        { status: 403 }
      );
    }

    // Obtener documentos filtrados por proveedor y empresa actual
    const documentos = await extendedDb.getProveedorDocumentos(
      proveedor,
      tenant.empresaCodigo
    );

    return NextResponse.json({
      success: true,
      documentos,
      total: documentos.length,
      tenant: {
        empresa: tenant.tenantName,
        codigo: tenant.empresaCodigo,
        proveedor
      }
    });
  } catch (error: any) {
    console.error('[API] Error al obtener documentos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener documentos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/proveedores/documentos
 * Subir un nuevo documento para la empresa actual
 *
 * Body:
 * {
 *   tipoDocumento: string,
 *   nombreArchivo: string,
 *   archivoURL: string,
 *   archivoTipo?: string,
 *   archivoTamanio?: number,
 *   fechaVencimiento?: Date
 * }
 */
export const POST = withTenantContext(async (request, { tenant, user }) => {
  try {
    // Validar que sea proveedor o admin
    if (user.role !== 'proveedor' && user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Solo proveedores pueden subir documentos'
        },
        { status: 403 }
      );
    }

    // Validar que tenga proveedor asignado
    if (!tenant.proveedorCodigo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no está mapeado a un proveedor'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      tipoDocumento,
      nombreArchivo,
      archivoURL,
      archivoTipo,
      archivoTamanio,
      fechaVencimiento,
    } = body;

    // Validaciones
    if (!tipoDocumento || !nombreArchivo || !archivoURL) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos incompletos. Se requiere: tipoDocumento, nombreArchivo, archivoURL'
        },
        { status: 400 }
      );
    }

    // Crear documento asociado a la empresa y proveedor actual
    const documento = await extendedDb.createProveedorDocumento({
      documentoID: uuidv4(),
      proveedor: tenant.proveedorCodigo,
      usuario: user.name || user.email || 'Usuario',
      empresa: tenant.empresaCodigo, // Asociar a la empresa actual del tenant
      tipoDocumento,
      nombreArchivo,
      archivoURL,
      archivoTipo: archivoTipo || 'application/pdf',
      archivoTamanio,
      fechaVencimiento,
      estatus: 'PENDIENTE',
    });

    // Registrar en auditoría
    await audit({
      usuario: user.id,
      usuarioNombre: user.email || 'Usuario',
      empresa: tenant.empresaCodigo,
      accion: 'CREATE',
      tablaAfectada: 'ProvDocumentos',
      registroID: documento.documentoID,
      valoresNuevos: documento,
      request,
    });

    return NextResponse.json({
      success: true,
      documento,
      message: 'Documento creado exitosamente',
      tenant: {
        empresa: tenant.tenantName,
        codigo: tenant.empresaCodigo,
        proveedor: tenant.proveedorCodigo
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Error al crear documento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/proveedores/documentos
 * Actualizar estatus de un documento
 *
 * Body:
 * {
 *   documentoID: string,
 *   estatus: string,
 *   comentarios?: string
 * }
 */
export const PATCH = withTenantContext(async (request, { tenant, user }) => {
  try {
    const body = await request.json();
    const { documentoID, estatus, comentarios } = body;

    if (!documentoID || !estatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentoID y estatus son requeridos'
        },
        { status: 400 }
      );
    }

    // TODO: Validar que el documento pertenezca a la empresa actual del tenant
    // antes de actualizarlo

    await extendedDb.updateDocumentoEstatus(
      documentoID,
      estatus,
      user.id,
      user.email || 'Usuario',
      comentarios
    );

    // Registrar en auditoría
    await audit({
      usuario: user.id,
      usuarioNombre: user.email || 'Usuario',
      empresa: tenant.empresaCodigo,
      accion: 'UPDATE',
      tablaAfectada: 'ProvDocumentos',
      registroID: documentoID,
      valoresNuevos: { estatus, comentarios },
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Documento actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('[API] Error al actualizar documento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar documento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});
