// src/app/api/proveedor/documentos/upload/route.ts
// Upload de documentos del proveedor a Azure Blob Storage

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { uploadBufferToBlob } from '@/lib/blob-storage';
import { buildBlobPath } from '@/lib/blob-path-builder';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';
import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/proveedor/documentos/upload
 * Sube un documento del proveedor a Azure Blob Storage
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'proveedor' && session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipoDocumento = formData.get('tipoDocumento') as string;
    const empresa = formData.get('empresa') as string;
    const proveedor = formData.get('proveedor') as string;

    if (!file || !tipoDocumento) {
      return NextResponse.json(
        { success: false, error: 'Se requiere archivo y tipo de documento' },
        { status: 400 }
      );
    }

    // Validar MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten archivos PDF, JPG o PNG' },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo no debe superar 10MB' },
        { status: 400 }
      );
    }

    // Obtener empresa ERP
    const empresaActual = empresa || session.user.empresaActual;
    const erpEmpresa = getEmpresaERPFromTenant(empresaActual) || empresaActual || 'general';

    // Obtener código de proveedor
    const proveedorCode = proveedor || session.user.proveedor || session.user.id;

    // Construir ruta blob
    const ext = path.extname(file.name).replace(/^\./, '') || 'pdf';
    const blobPath = buildBlobPath({
      kind: 'documento-proveedor',
      empresaCode: erpEmpresa,
      idProveedor: proveedorCode,
      tipoDocumento,
      extension: ext,
    });

    // Subir a blob
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blobResult = await uploadBufferToBlob(buffer, blobPath, file.type);

    console.log(`[DOCUMENTO UPLOAD] Subido a blob: ${blobResult.blobPath}`);

    // Registrar en AnexoCta (ERP) si hay empresa
    let nuevoIDR: number | null = null;
    if (empresaActual) {
      try {
        const erpPool = await getERPConnection(empresaActual);
        const insertResult = await erpPool.request()
          .input('rama', sql.VarChar(10), 'CXP')
          .input('cuenta', sql.VarChar(20), proveedorCode)
          .input('nombre', sql.VarChar(255), tipoDocumento)
          .input('direccion', sql.VarChar(500), blobResult.blobPath)
          .input('documento', sql.VarChar(50), tipoDocumento)
          .input('usuario', sql.VarChar(10), (session.user.name || session.user.email || 'PortalProv').substring(0, 10))
          .query(`
            INSERT INTO AnexoCta (Rama, Cuenta, Nombre, Direccion, Documento, Alta, Usuario, Autorizado, Rechazado)
            OUTPUT INSERTED.IDR
            VALUES (@rama, @cuenta, @nombre, @direccion, @documento, GETDATE(), @usuario, 0, 0)
          `);
        nuevoIDR = insertResult.recordset[0]?.IDR;
        console.log(`[DOCUMENTO UPLOAD] Insertado en AnexoCta con IDR: ${nuevoIDR}`);
      } catch (erpError: any) {
        console.error('[DOCUMENTO UPLOAD] Error insertando en AnexoCta:', erpError.message);
      }
    }

    // Registrar en archivos_blob para tracking
    try {
      const portalPool = await getPortalConnection();
      await portalPool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('empresaCode', sql.VarChar(50), empresaActual || 'general')
        .input('proveedorCode', sql.VarChar(20), proveedorCode)
        .input('blobContainer', sql.VarChar(100), blobResult.container)
        .input('blobPath', sql.VarChar(500), blobResult.blobPath)
        .input('contentType', sql.VarChar(100), file.type)
        .input('tamano', sql.BigInt, file.size)
        .input('tipoArchivo', sql.VarChar(50), 'documento-proveedor')
        .input('entidadTipo', sql.VarChar(50), 'documento')
        .input('entidadId', sql.VarChar(100), nuevoIDR ? nuevoIDR.toString() : null)
        .input('nombreOriginal', sql.NVarChar(255), file.name)
        .input('createdBy', sql.NVarChar(100), session.user.email || session.user.id)
        .query(`
          INSERT INTO archivos_blob (
            id, empresa_code, proveedor_code,
            blob_container, blob_path, content_type,
            tamano, tipo_archivo, entidad_tipo, entidad_id,
            nombre_original, created_by
          ) VALUES (
            @id, @empresaCode, @proveedorCode,
            @blobContainer, @blobPath, @contentType,
            @tamano, @tipoArchivo, @entidadTipo, @entidadId,
            @nombreOriginal, @createdBy
          )
        `);
    } catch (trackError: any) {
      console.error('[DOCUMENTO UPLOAD] Error en tracking archivos_blob:', trackError.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        documentoId: nuevoIDR,
        blobPath: blobResult.blobPath,
        container: blobResult.container,
        storageType: 'blob',
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('[DOCUMENTO UPLOAD] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir documento', details: error.message },
      { status: 500 }
    );
  }
}
