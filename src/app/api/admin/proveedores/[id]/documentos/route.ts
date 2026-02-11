// src/app/api/admin/proveedores/[id]/documentos/route.ts
// Endpoint para que el admin obtenga documentos de cualquier proveedor
// Combina datos del ERP (AnexoCta) con estados del portal (ProvDocumentosEstado)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { uploadBufferToBlob } from '@/lib/blob-storage';
import { buildBlobPath } from '@/lib/blob-path-builder';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';
import sql from 'mssql';

/**
 * GET /api/admin/proveedores/[id]/documentos
 * Obtiene los documentos de un proveedor específico (solo admin)
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

    const { id } = await params;
    console.log(`[ADMIN DOCUMENTOS] ID recibido: ${id}`);

    // Obtener empresa de la sesión
    const empresaActual = session.user.empresaActual;
    if (!empresaActual) {
      return NextResponse.json(
        { error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    // Conectar al ERP usando la empresa de la sesión
    const erpPool = await getERPConnection(empresaActual);

    // Buscar el proveedor para obtener su código correcto
    const provResult = await erpPool.request()
      .input('searchId', sql.VarChar(20), id)
      .query(`
        SELECT Proveedor, Nombre 
        FROM Prov 
        WHERE Proveedor = @searchId
      `);

    if (provResult.recordset.length === 0) {
      return NextResponse.json(
        { error: `Proveedor ${id} no encontrado` },
        { status: 404 }
      );
    }

    const codigoProveedor = provResult.recordset[0].Proveedor;

    console.log(`[ADMIN DOCUMENTOS] Proveedor encontrado: ${codigoProveedor} - ${provResult.recordset[0].Nombre}`);

    // Obtener catálogo de documentos requeridos para proveedores
    const documentosRequeridosResult = await erpPool.request()
      .query(`
        SELECT
          Rama,
          Documento,
          Grupo,
          Orden,
          Requerido
        FROM DocRama
        WHERE Rama = 'CXP' AND Grupo = 'Check List de Proveedores'
        ORDER BY Orden
      `);

    console.log(`[ADMIN DOCUMENTOS] Documentos requeridos encontrados: ${documentosRequeridosResult.recordset.length}`);
    if (documentosRequeridosResult.recordset.length > 0) {
      console.log('[ADMIN DOCUMENTOS] Primeros documentos:', documentosRequeridosResult.recordset.slice(0, 3).map(d => d.Documento));
    }

    // Primero verificar si existen registros en AnexoCta para este proveedor
    const testAnexos = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), codigoProveedor)
      .query(`SELECT COUNT(*) as total FROM AnexoCta WHERE Cuenta = @proveedorCode`);

    console.log(`[ADMIN DOCUMENTOS] Total anexos en AnexoCta para ${codigoProveedor}: ${testAnexos.recordset[0].total}`);

    // Obtener archivos adjuntos del proveedor desde AnexoCta
    const anexosResult = await erpPool.request()
      .input('proveedorCode', sql.VarChar(20), codigoProveedor)
      .query(`
        SELECT TOP 100
          IDR,
          Rama,
          Cuenta,
          Nombre AS NombreDocumento,
          Direccion AS RutaArchivo,
          Documento,
          Alta AS FechaAlta,
          UltimoCambio AS FechaUltimoCambio,
          Usuario,
          Autorizado,
          Rechazado,
          Observaciones
        FROM AnexoCta
        WHERE Cuenta = @proveedorCode
        ORDER BY Alta DESC
      `);

    console.log(`[ADMIN DOCUMENTOS] Anexos obtenidos: ${anexosResult.recordset.length}`);
    if (anexosResult.recordset.length > 0) {
      console.log('[ADMIN DOCUMENTOS] Primer anexo:', anexosResult.recordset[0]);
    }

    // Obtener estados de documentos desde el portal (PP)
    let estadosPortal: any[] = [];
    try {
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

      const estadosResult = await portalPool.request()
        .input('proveedorCodigo', sql.VarChar(20), codigoProveedor)
        .query(`
          SELECT DocumentoIDR, Estatus, Observaciones, RevisadoPor, FechaRevision
          FROM ProvDocumentosEstado
          WHERE ProveedorCodigo = @proveedorCodigo
        `);
      estadosPortal = estadosResult.recordset;
      console.log(`[ADMIN DOCUMENTOS] Estados del portal obtenidos: ${estadosPortal.length}`);
    } catch (portalError) {
      console.log('[ADMIN DOCUMENTOS] No se pudieron obtener estados del portal:', portalError);
    }

    // Crear mapa de estados del portal por IDR
    const estadosMap = new Map<number, any>();
    estadosPortal.forEach((estado: any) => {
      estadosMap.set(estado.DocumentoIDR, estado);
    });

    // Combinar datos: documentos requeridos + archivos del proveedor + estados del portal
    const documentos = documentosRequeridosResult.recordset.map((docRequerido: any) => {
      // Buscar anexos que correspondan a este documento requerido
      const anexos = anexosResult.recordset.filter((anexo: any) => {
        const nombreAnexo = (anexo.NombreDocumento || '').toLowerCase().trim();
        const documentoRequerido = (docRequerido.Documento || '').toLowerCase().trim();
        const documentoAnexo = (anexo.Documento || '').toLowerCase().trim();

        // Matching exacto por nombre de documento
        if (nombreAnexo === documentoRequerido || documentoAnexo === documentoRequerido) {
          return true;
        }

        // Matching por palabras clave específicas para cada documento
        // Matching por frases clave (todas las palabras del grupo deben estar presentes)
        const matchingRules: { [key: string]: string[][] } = {
          'acta constitutiva': [['acta', 'constitutiva']],
          'poder del representante legal': [['poder', 'representante']],
          'ine del representante legal': [['ine', 'representante'], ['ine', 'legal']],
          'comprobante de domicilio fiscal': [['comprobante', 'domicilio']],
          'opinión de cumplimiento obligaciones sat': [['opinion', 'cumplimiento'], ['cumplimiento', 'sat']],
          'pago del imss': [['pago', 'imss'], ['imss']],
          'constancia de situación fiscal actual': [['constancia', 'fiscal'], ['situacion', 'fiscal']],
          'estados financieros': [['estados', 'financieros']],
          'acuse de declaración anual': [['acuse', 'declaracion']],
          'caratula estado de cuenta bancario': [['caratula', 'cuenta'], ['estado de cuenta', 'bancari']],
          'fotografia a color exterior del domicilio fiscal': [['fotografia', 'exterior'], ['foto', 'domicilio']],
          'referencias comerciales': [['referencias', 'comerciales']],
          'solicitud de alta proveedor (fm-lo-19)': [['solicitud', 'alta'], ['fm-lo-19']],
          'ficha de proveedores (fm-lo-18)': [['ficha', 'proveedores'], ['fm-lo-18']]
        };

        const phraseGroups = matchingRules[documentoRequerido];
        if (phraseGroups) {
          // Al menos un grupo debe tener TODAS sus palabras presentes en el nombre del anexo
          return phraseGroups.some(group =>
            group.every(word => nombreAnexo.includes(word))
          );
        }

        // Matching genérico por inclusión exacta (no parcial)
        return nombreAnexo === documentoRequerido || documentoAnexo === documentoRequerido;
      });

      const anexoReciente = anexos.length > 0 ? anexos[0] : null;

      // Obtener estado del portal si existe
      const estadoPortal = anexoReciente ? estadosMap.get(anexoReciente.IDR) : null;

      // Determinar estado: priorizar portal sobre ERP
      let autorizado = false;
      let rechazado = false;
      let observaciones = null;
      let revisadoPor = null;
      let fechaRevision = null;

      if (estadoPortal) {
        // Usar estado del portal
        autorizado = estadoPortal.Estatus === 'APROBADO';
        rechazado = estadoPortal.Estatus === 'RECHAZADO';
        observaciones = estadoPortal.Observaciones;
        revisadoPor = estadoPortal.RevisadoPor;
        fechaRevision = estadoPortal.FechaRevision;
      } else if (anexoReciente) {
        // Fallback a estado del ERP
        autorizado = anexoReciente.Autorizado === 1;
        rechazado = anexoReciente.Rechazado === 1;
        observaciones = anexoReciente.Observaciones;
      }

      return {
        documentoRequerido: docRequerido.Documento,
        grupo: docRequerido.Grupo,
        orden: docRequerido.Orden,
        requerido: docRequerido.Requerido === 1,
        tieneArchivo: anexos.length > 0,
        cantidadArchivos: anexos.length,

        ...(anexoReciente && {
          idr: anexoReciente.IDR,
          nombreArchivo: anexoReciente.NombreDocumento,
          rutaArchivo: anexoReciente.RutaArchivo,
          tipo: anexoReciente.Tipo,
          fechaAlta: anexoReciente.FechaAlta,
          fechaUltimoCambio: anexoReciente.FechaUltimoCambio,
          usuario: anexoReciente.Usuario,
          autorizado,
          rechazado,
          observaciones,
          revisadoPor,
          fechaRevision,
          comentario: anexoReciente.Comentario,
          vencimiento: anexoReciente.Vencimiento,
          estadoPortal: estadoPortal?.Estatus || null,
        }),

        anexos: anexos.map((a: any) => {
          const estadoAnexo = estadosMap.get(a.IDR);
          return {
            idr: a.IDR,
            nombreArchivo: a.NombreDocumento,
            rutaArchivo: a.RutaArchivo,
            tipo: a.Tipo,
            fechaAlta: a.FechaAlta,
            fechaUltimoCambio: a.FechaUltimoCambio,
            usuario: a.Usuario,
            autorizado: estadoAnexo ? estadoAnexo.Estatus === 'APROBADO' : a.Autorizado === 1,
            rechazado: estadoAnexo ? estadoAnexo.Estatus === 'RECHAZADO' : a.Rechazado === 1,
            observaciones: estadoAnexo?.Observaciones || a.Observaciones,
            estadoPortal: estadoAnexo?.Estatus || null,
          };
        })
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        codigoProveedorERP: codigoProveedor,
        totalDocumentosRequeridos: documentosRequeridosResult.recordset.length,
        totalArchivosSubidos: anexosResult.recordset.length,
        documentos: documentos,
        estadisticas: {
          documentosConArchivo: documentos.filter((d: any) => d.tieneArchivo).length,
          documentosSinArchivo: documentos.filter((d: any) => !d.tieneArchivo).length,
          documentosAutorizados: documentos.filter((d: any) => d.autorizado).length,
          documentosRechazados: documentos.filter((d: any) => d.rechazado).length,
          documentosPendientes: documentos.filter((d: any) => d.tieneArchivo && !d.autorizado && !d.rechazado).length,
        }
      }
    });

  } catch (error: any) {
    console.error('[ADMIN DOCUMENTOS] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener documentos del proveedor',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/proveedores/[id]/documentos
 * Sube un nuevo documento para un proveedor (admin)
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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

    const { id } = await params;

    // Soportar tanto FormData (nuevo) como JSON (legacy)
    const contentType = request.headers.get('content-type') || '';
    let tipoDocumento: string;
    let buffer: Buffer;
    let fileName: string;
    let fileContentType: string;
    let replaceIdr: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      tipoDocumento = formData.get('tipoDocumento') as string;
      fileName = file?.name || 'documento';
      fileContentType = file?.type || 'application/octet-stream';
      const replaceIdrStr = formData.get('replaceIdr') as string;
      if (replaceIdrStr) replaceIdr = parseInt(replaceIdrStr);

      if (!file || !tipoDocumento) {
        return NextResponse.json(
          { success: false, error: 'Datos incompletos: se requiere file y tipoDocumento' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      tipoDocumento = body.tipoDocumento;
      if (body.replaceIdr) replaceIdr = parseInt(body.replaceIdr);
      fileName = body.fileName;
      fileContentType = body.fileType || 'application/octet-stream';

      if (!tipoDocumento || !body.file || !fileName) {
        return NextResponse.json(
          { success: false, error: 'Datos incompletos: se requiere tipoDocumento, file y fileName' },
          { status: 400 }
        );
      }

      const base64Data = body.file.split(',')[1] || body.file;
      buffer = Buffer.from(base64Data, 'base64');
    }

    console.log(`[ADMIN DOCUMENTOS POST] Subiendo documento para proveedor ${id}`);
    console.log(`[ADMIN DOCUMENTOS POST] Tipo: ${tipoDocumento}, Archivo: ${fileName}`);

    // Obtener empresa de la sesión
    const empresaActual = session.user.empresaActual;
    if (!empresaActual) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    // Conectar al ERP usando la empresa de la sesión
    const erpPool = await getERPConnection(empresaActual);

    // Verificar que el proveedor existe
    const provResult = await erpPool.request()
      .input('searchId', sql.VarChar(20), id)
      .query(`SELECT Proveedor, Nombre FROM Prov WHERE Proveedor = @searchId`);

    if (provResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: `Proveedor ${id} no encontrado` },
        { status: 404 }
      );
    }

    const codigoProveedor = provResult.recordset[0].Proveedor;
    const erpEmpresa = getEmpresaERPFromTenant(empresaActual) || empresaActual;

    // Subir a Azure Blob Storage
    const ext = fileName.split('.').pop() || 'pdf';
    const blobPath = buildBlobPath({
      kind: 'documento-proveedor',
      empresaCode: erpEmpresa,
      idProveedor: codigoProveedor,
      tipoDocumento,
      extension: ext,
    });

    const blobResult = await uploadBufferToBlob(buffer, blobPath, fileContentType);
    console.log(`[ADMIN DOCUMENTOS POST] Archivo subido a blob: ${blobResult.blobPath}`);

    // Escritura local dual (opcional, para compatibilidad ERP)
    let fullFilePath = blobResult.blobPath; // Default: usar blob path en AnexoCta
    if (process.env.KEEP_LOCAL_ANEXOS === 'true') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const erpAnexosPath = process.env.ERP_ANEXOS_PATH || 'C:\\Anexos';
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const finalFileName = `${timestamp}-${sanitizedFileName}`;
        const relativePath = `Proveedores\\${codigoProveedor}\\${year}\\${month}\\${day}`;
        const fullDirPath = `${erpAnexosPath}\\${relativePath}`;
        const localPath = path.join(fullDirPath, finalFileName);

        fs.mkdirSync(fullDirPath, { recursive: true });
        fs.writeFileSync(localPath, buffer);
        fullFilePath = localPath;
        console.log(`[ADMIN DOCUMENTOS POST] Copia local guardada en: ${localPath}`);
      } catch (localError: any) {
        console.error('[ADMIN DOCUMENTOS POST] Error en escritura local (no bloqueante):', localError.message);
      }
    }

    let finalIDR: number;

    if (replaceIdr) {
      // Reemplazo: borrar blob anterior y actualizar AnexoCta
      const oldRecord = await erpPool.request()
        .input('idr', sql.Int, replaceIdr)
        .query(`SELECT Direccion FROM AnexoCta WHERE IDR = @idr`);

      if (oldRecord.recordset.length > 0) {
        const oldPath = oldRecord.recordset[0].Direccion;
        if (oldPath && oldPath.startsWith('empresa/')) {
          try {
            const { deleteBlob } = await import('@/lib/blob-storage');
            await deleteBlob(oldPath);
            console.log(`[ADMIN DOCUMENTOS POST] Blob anterior eliminado: ${oldPath}`);
          } catch (delError: any) {
            console.error('[ADMIN DOCUMENTOS POST] Error eliminando blob anterior:', delError.message);
          }
        }
      }

      await erpPool.request()
        .input('idr', sql.Int, replaceIdr)
        .input('direccion', sql.VarChar(255), fullFilePath)
        .input('usuario', sql.VarChar(10), (session.user.name || session.user.email || 'AdminPort').substring(0, 10))
        .query(`
          UPDATE AnexoCta
          SET Direccion = @direccion,
              UltimoCambio = GETDATE(),
              Usuario = @usuario,
              Autorizado = 0,
              Rechazado = 0
          WHERE IDR = @idr
        `);

      finalIDR = replaceIdr;
      console.log(`[ADMIN DOCUMENTOS POST] Documento reemplazado IDR: ${finalIDR}`);

      // Resetear estado en portal (ProvDocumentosEstado)
      try {
        const portalPool = await getPortalConnection();
        await portalPool.request()
          .input('documentoIDR', sql.Int, replaceIdr)
          .input('proveedorCodigo', sql.VarChar(20), codigoProveedor)
          .query(`
            UPDATE ProvDocumentosEstado
            SET Estatus = 'PENDIENTE', Observaciones = 'Documento reemplazado', UpdatedAt = GETDATE()
            WHERE DocumentoIDR = @documentoIDR AND ProveedorCodigo = @proveedorCodigo
          `);
      } catch (portalError: any) {
        console.error('[ADMIN DOCUMENTOS POST] Error reseteando estado portal:', portalError.message);
      }
    } else {
      // Insertar nuevo registro en AnexoCta
      const insertResult = await erpPool.request()
        .input('rama', sql.VarChar(5), 'CXP')
        .input('cuenta', sql.VarChar(20), codigoProveedor)
        .input('nombre', sql.VarChar(255), tipoDocumento)
        .input('direccion', sql.VarChar(255), fullFilePath)
        .input('documento', sql.VarChar(50), tipoDocumento)
        .input('usuario', sql.VarChar(10), (session.user.name || session.user.email || 'AdminPort').substring(0, 10))
        .query(`
          INSERT INTO AnexoCta (Rama, Cuenta, Nombre, Direccion, Documento, Alta, Usuario, Autorizado, Rechazado)
          OUTPUT INSERTED.IDR
          VALUES (@rama, @cuenta, @nombre, @direccion, @documento, GETDATE(), @usuario, 0, 0)
        `);

      finalIDR = insertResult.recordset[0]?.IDR;
      console.log(`[ADMIN DOCUMENTOS POST] Documento insertado con IDR: ${finalIDR}`);
    }

    return NextResponse.json({
      success: true,
      message: replaceIdr ? 'Documento reemplazado correctamente' : 'Documento subido correctamente',
      data: {
        idr: finalIDR,
        blobPath: blobResult.blobPath,
        container: blobResult.container,
        storageType: 'blob',
        tipoDocumento,
        replaced: !!replaceIdr,
      }
    });

  } catch (error: any) {
    console.error('[ADMIN DOCUMENTOS POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al subir el documento',
        details: error.message,
      },
      { status: 500 }
    );
  }
}