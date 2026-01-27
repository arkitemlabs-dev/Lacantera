// src/app/api/admin/proveedores/[id]/documentos/route.ts
// Endpoint para que el admin obtenga documentos de cualquier proveedor
// Combina datos del ERP (AnexoCta) con estados del portal (ProvDocumentosEstado)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection, getPortalConnection } from '@/lib/database/multi-tenant-connection';
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

    // Conectar al ERP
    const erpPool = await getERPConnection('la-cantera');

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
        const matchingRules: { [key: string]: string[] } = {
          'acta constitutiva': ['acta', 'constitutiva'],
          'poder del representante legal': ['poder', 'representante', 'legal'],
          'ine del representante legal': ['ine', 'identificacion', 'representante'],
          'comprobante de domicilio fiscal': ['comprobante', 'domicilio', 'fiscal'],
          'opinión de cumplimiento obligaciones sat': ['opinion', 'cumplimiento', 'sat', 'obligaciones'],
          'pago del imss': ['pago', 'imss'],
          'constancia de situación fiscal actual': ['constancia', 'situacion', 'fiscal'],
          'estados financieros': ['estados', 'financieros'],
          'acuse de declaración anual': ['acuse', 'declaracion', 'anual'],
          'caratula estado de cuenta bancario': ['caratula', 'estado', 'cuenta', 'bancario', 'bancaria'],
          'fotografia a color exterior del domicilio fiscal': ['fotografia', 'foto', 'exterior', 'domicilio'],
          'referencias comerciales': ['referencias', 'comerciales'],
          'solicitud de alta proveedor (fm-lo-19)': ['solicitud', 'alta', 'proveedor', 'fm-lo-19'],
          'ficha de proveedores (fm-lo-18)': ['ficha', 'proveedores', 'fm-lo-18']
        };

        const keywords = matchingRules[documentoRequerido];
        if (keywords) {
          return keywords.some(keyword => nombreAnexo.includes(keyword));
        }

        // Matching genérico por inclusión
        return nombreAnexo.includes(documentoRequerido) || documentoRequerido.includes(nombreAnexo);
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
    const body = await request.json();
    const { tipoDocumento, file, fileName, fileType } = body;

    console.log(`[ADMIN DOCUMENTOS POST] Subiendo documento para proveedor ${id}`);
    console.log(`[ADMIN DOCUMENTOS POST] Tipo: ${tipoDocumento}, Archivo: ${fileName}`);

    if (!tipoDocumento || !file || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos: se requiere tipoDocumento, file y fileName' },
        { status: 400 }
      );
    }

    // Conectar al ERP
    const erpPool = await getERPConnection('la-cantera');

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

    // Convertir base64 a buffer
    const base64Data = file.split(',')[1] || file;
    const buffer = Buffer.from(base64Data, 'base64');

    // Crear la estructura de directorios para guardar el archivo
    // Formato: {ERP_ANEXOS_PATH}/Proveedores/{Año}/{Mes}/{Día}/{nombreArchivo}
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // Ruta base para anexos (configurar en variables de entorno)
    const erpAnexosPath = process.env.ERP_ANEXOS_PATH || 'C:\\Anexos';

    // Sanitizar nombre de archivo
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFileName = `${timestamp}-${sanitizedFileName}`;

    // Construir ruta completa
    const relativePath = `Proveedores\\${codigoProveedor}\\${year}\\${month}\\${day}`;
    const fullDirPath = `${erpAnexosPath}\\${relativePath}`;
    const fullFilePath = `${fullDirPath}\\${finalFileName}`;

    // Importar fs dinámicamente para escribir el archivo
    const fs = await import('fs');
    const path = await import('path');

    // Crear directorios si no existen
    try {
      fs.mkdirSync(fullDirPath, { recursive: true });
    } catch (mkdirError) {
      console.error('[ADMIN DOCUMENTOS POST] Error creando directorio:', mkdirError);
    }

    // Guardar el archivo
    try {
      fs.writeFileSync(fullFilePath, buffer);
      console.log(`[ADMIN DOCUMENTOS POST] Archivo guardado en: ${fullFilePath}`);
    } catch (writeError: any) {
      console.error('[ADMIN DOCUMENTOS POST] Error guardando archivo:', writeError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al guardar el archivo en el servidor',
          details: writeError.message
        },
        { status: 500 }
      );
    }

    // Insertar registro en AnexoCta
    const insertResult = await erpPool.request()
      .input('rama', sql.VarChar(10), 'CXP')
      .input('cuenta', sql.VarChar(20), codigoProveedor)
      .input('nombre', sql.VarChar(255), tipoDocumento)
      .input('direccion', sql.VarChar(500), fullFilePath)
      .input('documento', sql.VarChar(50), tipoDocumento)
      .input('usuario', sql.VarChar(50), session.user.name || session.user.email || 'Admin Portal')
      .query(`
        INSERT INTO AnexoCta (Rama, Cuenta, Nombre, Direccion, Documento, Alta, Usuario, Autorizado, Rechazado)
        OUTPUT INSERTED.IDR
        VALUES (@rama, @cuenta, @nombre, @direccion, @documento, GETDATE(), @usuario, 0, 0)
      `);

    const nuevoIDR = insertResult.recordset[0]?.IDR;

    console.log(`[ADMIN DOCUMENTOS POST] Documento insertado con IDR: ${nuevoIDR}`);

    return NextResponse.json({
      success: true,
      message: 'Documento subido correctamente',
      data: {
        idr: nuevoIDR,
        rutaArchivo: fullFilePath,
        nombreArchivo: finalFileName,
        tipoDocumento
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