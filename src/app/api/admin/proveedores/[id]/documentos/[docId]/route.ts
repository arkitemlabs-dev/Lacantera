/**
 * API Route: Acciones sobre documentos de proveedores
 * PATCH /api/admin/proveedores/[id]/documentos/[docId]
 *
 * Actualiza el estado de un documento en la tabla ProvDocumentosEstado del portal (PP)
 * Esta tabla almacena los estados de aprobación/rechazo de forma independiente del ERP
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; docId: string }> }
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

    const { id: proveedorId, docId } = await params;
    const { action, motivo } = await request.json();

    console.log('[PATCH DOCUMENTO] Params:', { proveedorId, docId, action, motivo });

    if (!action || !['aprobar', 'rechazar', 'solicitar_actualizacion', 'solicitar_documento'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      );
    }

    if ((action === 'rechazar' || action === 'solicitar_actualizacion' || action === 'solicitar_documento') && !motivo?.trim()) {
      return NextResponse.json(
        { error: 'El motivo es requerido para esta acción' },
        { status: 400 }
      );
    }

    // Conectar al Portal (PP)
    const portalPool = await getPortalConnection();

    // Asegurar que la tabla existe
    await portalPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProvDocumentosEstado' AND xtype='U')
      CREATE TABLE ProvDocumentosEstado (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DocumentoIDR INT NOT NULL,
        ProveedorCodigo VARCHAR(20) NOT NULL,
        Estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        Observaciones NVARCHAR(500) NULL,
        RevisadoPor VARCHAR(100) NULL,
        FechaRevision DATETIME2 NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE()
      )
    `);

    // Determinar el estatus según la acción
    let estatus = 'PENDIENTE';
    let observaciones = motivo || null;

    switch (action) {
      case 'aprobar':
        estatus = 'APROBADO';
        observaciones = motivo || 'Documento aprobado';
        break;
      case 'rechazar':
        estatus = 'RECHAZADO';
        break;
      case 'solicitar_actualizacion':
        estatus = 'PENDIENTE';
        observaciones = `Actualización solicitada: ${motivo}`;
        break;
      case 'solicitar_documento':
        estatus = 'SOLICITADO';
        break;
    }

    const revisadoPor = session.user.name || session.user.email || 'Admin Portal';

    // Verificar si ya existe un registro para este documento
    const existingRecord = await portalPool.request()
      .input('documentoIDR', sql.Int, parseInt(docId))
      .input('proveedorCodigo', sql.VarChar(20), proveedorId)
      .query(`
        SELECT ID FROM ProvDocumentosEstado
        WHERE DocumentoIDR = @documentoIDR AND ProveedorCodigo = @proveedorCodigo
      `);

    if (existingRecord.recordset.length > 0) {
      // Actualizar registro existente
      await portalPool.request()
        .input('documentoIDR', sql.Int, parseInt(docId))
        .input('proveedorCodigo', sql.VarChar(20), proveedorId)
        .input('estatus', sql.VarChar(20), estatus)
        .input('observaciones', sql.NVarChar(500), observaciones)
        .input('revisadoPor', sql.VarChar(100), revisadoPor)
        .query(`
          UPDATE ProvDocumentosEstado
          SET
            Estatus = @estatus,
            Observaciones = @observaciones,
            RevisadoPor = @revisadoPor,
            FechaRevision = GETDATE(),
            UpdatedAt = GETDATE()
          WHERE DocumentoIDR = @documentoIDR AND ProveedorCodigo = @proveedorCodigo
        `);
      console.log('[PATCH DOCUMENTO] Registro actualizado en portal');
    } else {
      // Insertar nuevo registro
      await portalPool.request()
        .input('documentoIDR', sql.Int, parseInt(docId))
        .input('proveedorCodigo', sql.VarChar(20), proveedorId)
        .input('estatus', sql.VarChar(20), estatus)
        .input('observaciones', sql.NVarChar(500), observaciones)
        .input('revisadoPor', sql.VarChar(100), revisadoPor)
        .query(`
          INSERT INTO ProvDocumentosEstado (DocumentoIDR, ProveedorCodigo, Estatus, Observaciones, RevisadoPor, FechaRevision)
          VALUES (@documentoIDR, @proveedorCodigo, @estatus, @observaciones, @revisadoPor, GETDATE())
        `);
      console.log('[PATCH DOCUMENTO] Nuevo registro creado en portal');
    }

    // Generar mensaje de respuesta
    let mensaje = '';
    switch (action) {
      case 'aprobar':
        mensaje = 'Documento aprobado correctamente';
        break;
      case 'rechazar':
        mensaje = 'Documento rechazado correctamente';
        break;
      case 'solicitar_actualizacion':
        mensaje = 'Solicitud de actualización registrada';
        break;
      case 'solicitar_documento':
        mensaje = 'Solicitud de documento enviada al proveedor';
        break;
    }

    return NextResponse.json({
      success: true,
      message: mensaje,
      data: {
        documentoId: parseInt(docId),
        proveedorId,
        action,
        estatus
      }
    });

  } catch (error) {
    console.error('[PATCH DOCUMENTO] Error:', error);
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