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
    const replaceIdrStr = formData.get('replaceIdr') as string;
    const replaceIdr = replaceIdrStr ? parseInt(replaceIdrStr) : null;

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

    // Obtener código ERP del proveedor via mapping
    const portalPool = await getPortalConnection();
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), session.user.id)
      .input('empresa', sql.VarChar(50), empresaActual)
      .query(`
        SELECT erp_proveedor_code
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId AND empresa_code = @empresa AND activo = 1
      `);

    const proveedorCode = mappingResult.recordset.length > 0
      ? mappingResult.recordset[0].erp_proveedor_code
      : (session.user.proveedor || session.user.id);

    console.log(`[DOCUMENTO UPLOAD] Portal: ${session.user.proveedor}, ERP: ${proveedorCode}`);

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

    // Registrar/actualizar en AnexoCta (ERP) si hay empresa
    let finalIDR: number | null = null;
    if (empresaActual) {
      try {
        const erpPool = await getERPConnection(empresaActual);

        if (replaceIdr) {
          // Reemplazo: borrar blob anterior y actualizar registro
          const oldRecord = await erpPool.request()
            .input('idr', sql.Int, replaceIdr)
            .query(`SELECT Direccion FROM AnexoCta WHERE IDR = @idr`);

          if (oldRecord.recordset.length > 0) {
            const oldPath = oldRecord.recordset[0].Direccion;
            if (oldPath && oldPath.startsWith('empresa/')) {
              try {
                const { deleteBlob } = await import('@/lib/blob-storage');
                await deleteBlob(oldPath);
                console.log(`[DOCUMENTO UPLOAD] Blob anterior eliminado: ${oldPath}`);
              } catch (delError: any) {
                console.error('[DOCUMENTO UPLOAD] Error eliminando blob anterior:', delError.message);
              }
            }
          }

          await erpPool.request()
            .input('idr', sql.Int, replaceIdr)
            .input('direccion', sql.VarChar(255), blobResult.blobPath)
            .input('usuario', sql.VarChar(10), (session.user.name || session.user.email || 'PortalProv').substring(0, 10))
            .query(`
              UPDATE AnexoCta
              SET Direccion = @direccion, UltimoCambio = GETDATE(), Usuario = @usuario, Autorizado = 0, Rechazado = 0
              WHERE IDR = @idr
            `);

          finalIDR = replaceIdr;
          console.log(`[DOCUMENTO UPLOAD] Documento reemplazado IDR: ${finalIDR}`);
        } else {
          // Nuevo registro
          const insertResult = await erpPool.request()
            .input('rama', sql.VarChar(5), 'CXP')
            .input('cuenta', sql.VarChar(20), proveedorCode)
            .input('nombre', sql.VarChar(255), tipoDocumento)
            .input('direccion', sql.VarChar(255), blobResult.blobPath)
            .input('documento', sql.VarChar(50), tipoDocumento)
            .input('usuario', sql.VarChar(10), (session.user.name || session.user.email || 'PortalProv').substring(0, 10))
            .query(`
              INSERT INTO AnexoCta (Rama, Cuenta, Nombre, Direccion, Documento, Alta, Usuario, Autorizado, Rechazado)
              OUTPUT INSERTED.IDR
              VALUES (@rama, @cuenta, @nombre, @direccion, @documento, GETDATE(), @usuario, 0, 0)
            `);
          finalIDR = insertResult.recordset[0]?.IDR;
          console.log(`[DOCUMENTO UPLOAD] Insertado en AnexoCta con IDR: ${finalIDR}`);
        }
      } catch (erpError: any) {
        console.error('[DOCUMENTO UPLOAD] Error en AnexoCta:', erpError.message);
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
        .input('entidadId', sql.VarChar(100), finalIDR ? finalIDR.toString() : null)
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
        documentoId: finalIDR,
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
