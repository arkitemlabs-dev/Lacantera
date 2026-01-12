/**
 * API Route: Acciones sobre documentos de proveedores
 * PATCH /api/admin/proveedores/[id]/documentos/[docId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
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

    const { action, motivo } = await request.json();

    if (!action || !['aprobar', 'rechazar', 'solicitar_actualizacion'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      );
    }

    if ((action === 'rechazar' || action === 'solicitar_actualizacion') && !motivo?.trim()) {
      return NextResponse.json(
        { error: 'El motivo es requerido para rechazar o solicitar actualización' },
        { status: 400 }
      );
    }

    const pool = await getPortalConnection();
    const docId = parseInt(params.docId);
    const proveedorId = parseInt(params.id);

    if (isNaN(docId) || isNaN(proveedorId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Mapear acción a estado
    let nuevoEstado: string;
    switch (action) {
      case 'aprobar':
        nuevoEstado = 'aprobado';
        break;
      case 'rechazar':
        nuevoEstado = 'rechazado';
        break;
      case 'solicitar_actualizacion':
        nuevoEstado = 'pendiente';
        break;
      default:
        throw new Error('Acción no válida');
    }

    // Actualizar documento
    await pool.request()
      .input('docId', sql.Int, docId)
      .input('proveedorId', sql.Int, proveedorId)
      .input('estado', sql.VarChar(20), nuevoEstado)
      .input('motivo', sql.VarChar(500), motivo || null)
      .input('usuarioRevision', sql.VarChar(50), session.user.id)
      .input('fechaRevision', sql.DateTime2, new Date())
      .query(`
        UPDATE ProveedorDocumento 
        SET 
          Estado = @estado,
          MotivoRechazo = @motivo,
          UsuarioRevision = @usuarioRevision,
          FechaRevision = @fechaRevision
        WHERE ID = @docId 
          AND ProveedorID = @proveedorId
      `);

    // Registrar en audit log
    await pool.request()
      .input('usuarioId', sql.VarChar(50), session.user.id)
      .input('accion', sql.VarChar(100), `documento_${action}`)
      .input('recurso', sql.VarChar(100), `proveedor_${proveedorId}_documento_${docId}`)
      .input('detalles', sql.NVarChar(sql.MAX), JSON.stringify({
        proveedorId,
        documentoId: docId,
        accion: action,
        motivo: motivo || null,
        timestamp: new Date().toISOString()
      }))
      .input('ip', sql.VarChar(45), request.headers.get('x-forwarded-for') || 'unknown')
      .input('userAgent', sql.VarChar(500), request.headers.get('user-agent') || 'unknown')
      .query(`
        INSERT INTO AuditLog (UsuarioID, Accion, Recurso, Detalles, IP, UserAgent, Timestamp)
        VALUES (@usuarioId, @accion, @recurso, @detalles, @ip, @userAgent, GETDATE())
      `);

    return NextResponse.json({
      success: true,
      message: `Documento ${action === 'aprobar' ? 'aprobado' : action === 'rechazar' ? 'rechazado' : 'marcado para actualización'} correctamente`
    });

  } catch (error) {
    console.error('Error en acción de documento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la acción del documento',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}