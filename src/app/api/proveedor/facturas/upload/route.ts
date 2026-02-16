import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { parseCFDI, validateCFDI } from '@/lib/parsers/cfdi-parser';
import { validacionCompletaSAT } from '@/lib/sat-validator';
import sql from 'mssql';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getStoredProcedures } from '@/lib/database/stored-procedures';
import { uploadBufferToBlob } from '@/lib/blob-storage';
import { buildBlobPath } from '@/lib/blob-path-builder';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';

/**
 * POST /api/proveedor/facturas/upload
 *
 * Permite a proveedores subir facturas (XML + PDF opcional)
 *
 * Body (multipart/form-data):
 * - xml: Archivo XML del CFDI
 * - pdf: Archivo PDF (opcional)
 * - empresa_code: Código de empresa a la que va dirigida la factura
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [POST /api/proveedor/facturas/upload] Iniciando...');

    // 1. Autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Verificar rol (proveedor o admin)
    if (userRole !== 'proveedor' && userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Solo proveedores pueden subir facturas'
      }, { status: 403 });
    }

    console.log(`📍 Usuario: ${userId}, Rol: ${userRole}`);

    // 2. Parsear FormData
    const formData = await request.formData();
    const xmlFile = formData.get('xml') as File;
    const pdfFile = formData.get('pdf') as File | null;
    const empresaCode = formData.get('empresa_code') as string;
    const ordenCompraId = formData.get('orden_compra_id') as string;

    // Validar datos requeridos
    if (!xmlFile) {
      return NextResponse.json({
        success: false,
        error: 'Archivo XML es requerido'
      }, { status: 400 });
    }

    if (!empresaCode) {
      return NextResponse.json({
        success: false,
        error: 'Código de empresa es requerido'
      }, { status: 400 });
    }

    if (!ordenCompraId || ordenCompraId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Orden de compra es requerida'
      }, { status: 400 });
    }

    console.log(`📍 Empresa: ${empresaCode}, XML: ${xmlFile.name}`);

    // 3. Verificar acceso del proveedor a la empresa
    const portalPool = await getPortalConnection();
    const mappingResult = await portalPool.request()
      .input('userId', sql.NVarChar(50), userId)
      .input('empresa', sql.VarChar(50), empresaCode)
      .query(`
        SELECT
          erp_proveedor_code,
          empresa_code,
          permisos
        FROM portal_proveedor_mapping
        WHERE portal_user_id = @userId
          AND empresa_code = @empresa
          AND activo = 1
      `);

    if (!mappingResult.recordset || mappingResult.recordset.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No tiene acceso a esta empresa'
      }, { status: 403 });
    }

    const { erp_proveedor_code } = mappingResult.recordset[0];
    console.log(`✅ Proveedor código: ${erp_proveedor_code}`);

    // 4. Leer y parsear XML
    const xmlBuffer = await xmlFile.arrayBuffer();
    const xmlString = Buffer.from(xmlBuffer).toString('utf-8');

    let cfdiData;
    try {
      cfdiData = await parseCFDI(xmlString);
      console.log(`✅ XML parseado: UUID=${cfdiData.uuid}, Total=${cfdiData.total}`);
    } catch (parseError: any) {
      console.error('❌ Error parseando XML:', parseError);
      return NextResponse.json({
        success: false,
        error: 'El archivo XML no es un CFDI válido',
        details: process.env.NODE_ENV === 'development' ? parseError.message : undefined
      }, { status: 400 });
    }

    // =====================================================================
    // VALIDACIONES COMENTADAS PARA PRUEBAS
    // =====================================================================

    /* VALIDACIÓN CFDI - COMENTADA
    const validation = validateCFDI(cfdiData);
    if (!validation.isValid) {
      console.error('❌ CFDI inválido:', validation.errors);
      return NextResponse.json({
        success: false,
        error: 'El CFDI tiene errores de validación',
        errors: validation.errors,
        warnings: validation.warnings
      }, { status: 400 });
    }
    */
    const validation = { warnings: [] as string[] };
    console.log('🚧 VALIDACIONES COMENTADAS PARA PRUEBAS');

    /* VALIDACIÓN RFC EN ERP - COMENTADA
    const sp = getStoredProcedures();
    const rfcXml = cfdiData.rfcEmisor.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const erpProviderResult = await sp.spDatosProveedor({ ... });
    ...
    */

    /* VALIDACIÓN ORDEN DE COMPRA - COMENTADA
    const ordenesResult = await sp.getOrdenesCompra({ ... });
    ...
    */

    /* VALIDACIÓN MONTOS - COMENTADA */

    /* VALIDACIÓN UUID DUPLICADO - COMENTADA
    const duplicadoResult = await portalPool.request()
      .input('uuid', sql.VarChar(36), cfdiData.uuid)
      .query('SELECT ID FROM ProvFacturas WHERE UUID = @uuid');
    ...
    */

    /* VALIDACIÓN SAT - COMENTADA */
    let validacionSAT = null;
    let satValidado = false;
    let satEstado = 'PENDIENTE';
    let satMensaje = 'Validación SAT omitida (modo pruebas)';

    // 8. Subir archivos a Azure Blob Storage (ruta simplificada por UUID)
    const xmlBlobPath = `${cfdiData.uuid}.xml`;

    const xmlBlobResult = await uploadBufferToBlob(
      Buffer.from(xmlString),
      xmlBlobPath,
      'text/xml'
    );
    console.log(`✅ XML subido a blob: ${xmlBlobResult.blobPath}`);

    let pdfBlobPath: string | null = null;
    let pdfBlobContainer: string | null = null;
    if (pdfFile) {
      const pdfArrayBuffer = await pdfFile.arrayBuffer();
      pdfBlobPath = `${cfdiData.uuid}.pdf`;
      const pdfBlobResult = await uploadBufferToBlob(
        Buffer.from(pdfArrayBuffer),
        pdfBlobPath,
        'application/pdf'
      );
      pdfBlobContainer = pdfBlobResult.container;
      console.log(`✅ PDF subido a blob: ${pdfBlobResult.blobPath}`);
    }

    // 8.5. Ejecutar SP spGeneraRemisionCompra
    const sp = getStoredProcedures();
    const folioFactura = String(cfdiData.folio || cfdiData.uuid).substring(0, 50);
    const archivoXml = `${cfdiData.uuid}.xml`;

    console.log('📋 Llamando spGeneraRemisionCompra con:', {
      empresa: empresaCode,
      movId: ordenCompraId.trim(),
      proveedor: String(userId).substring(0, 10),
      folioFactura,
      archivo: archivoXml
    });

    const remisionResult = await sp.generaRemisionCompra({
      empresa: empresaCode,
      movId: ordenCompraId.trim(),
      proveedor: String(userId).substring(0, 10),
      folioFactura,
      archivo: archivoXml,
    });

    console.log(`📋 spGeneraRemisionCompra resultado:`, remisionResult);

    if (!remisionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Error al generar remisión de compra en el ERP',
        details: remisionResult.message
      }, { status: 500 });
    }

    // 9. Insertar en base de datos (tabla ProvFacturas)
    // TEMPORAL: Borrar factura existente con mismo UUID para permitir re-subir en pruebas
    await portalPool.request()
      .input('uuidDel', sql.VarChar(36), cfdiData.uuid)
      .query('DELETE FROM ProvFacturas WHERE UUID = @uuidDel');

    const facturaId = uuidv4();

    // Preparar datos de validación SAT para BD
    const satCodigoEstatus = validacionSAT?.validacionCFDI?.codigoEstatus || null;
    const satEsCancelable = validacionSAT?.validacionCFDI?.esCancelable || null;
    const satValidacionEFOS = validacionSAT?.validacionCFDI?.validacionEFOS || null;
    const satFechaConsulta = validacionSAT?.validacionCFDI?.fechaConsulta || null;

    // Generar FacturaID legible: FACT-{timestamp}
    const facturaIdLegible = `FACT-${Date.now()}`;

    await portalPool.request()
      .input('id', sql.UniqueIdentifier, facturaId)
      .input('facturaIdLegible', sql.VarChar(100), facturaIdLegible)
      .input('proveedor', sql.VarChar(10), String(userId).substring(0, 10))
      .input('empresaCode', sql.VarChar(5), empresaCode)
      .input('uuid', sql.VarChar(36), cfdiData.uuid)
      .input('serie', sql.VarChar(10), cfdiData.serie ? String(cfdiData.serie).substring(0, 10) : null)
      .input('folio', sql.VarChar(50), String(cfdiData.folio || cfdiData.uuid).substring(0, 50))
      .input('fechaEmision', sql.DateTime2, new Date(cfdiData.fecha))
      .input('subtotal', sql.Decimal(18, 2), cfdiData.subTotal)
      .input('impuestos', sql.Decimal(18, 2), cfdiData.totalImpuestosTrasladados || 0)
      .input('total', sql.Decimal(18, 2), cfdiData.total)
      .input('moneda', sql.VarChar(3), cfdiData.moneda || 'MXN')
      .input('xmlRuta', sql.VarChar(500), xmlBlobPath)
      .input('pdfRuta', sql.VarChar(500), pdfBlobPath || '')
      .input('subidoPor', sql.VarChar(10), String(userId).substring(0, 10))
      // Columnas nullable extras
      .input('xmlContenido', sql.NVarChar(sql.MAX), xmlString)
      .input('rfcEmisor', sql.VarChar(13), cfdiData.rfcEmisor)
      .input('nombreEmisor', sql.NVarChar(250), cfdiData.nombreEmisor)
      .input('rfcReceptor', sql.VarChar(13), cfdiData.rfcReceptor)
      .input('nombreReceptor', sql.NVarChar(250), cfdiData.nombreReceptor)
      .input('descuento', sql.Decimal(18, 2), cfdiData.descuento || 0)
      .input('tipoCambio', sql.Decimal(10, 4), cfdiData.tipoCambio || 1)
      .input('fechaTimbrado', sql.DateTime2, new Date(cfdiData.fechaTimbrado))
      .input('xmlBlobContainer', sql.VarChar(100), xmlBlobResult.container)
      .input('pdfBlobContainer', sql.VarChar(100), pdfBlobContainer)
      .input('storageType', sql.VarChar(20), 'blob')
      .input('satValidado', sql.Bit, satValidado ? 1 : 0)
      .input('satEstado', sql.VarChar(50), satEstado)
      .input('satCodigoEstatus', sql.VarChar(100), satCodigoEstatus)
      .input('satEsCancelable', sql.VarChar(50), satEsCancelable)
      .input('satValidacionEFOS', sql.VarChar(100), satValidacionEFOS)
      .input('satFechaConsulta', sql.DateTime2, satFechaConsulta)
      .input('satMensaje', sql.NVarChar(500), satMensaje)
      .query(`
        INSERT INTO ProvFacturas (
          FacturaID, Proveedor, Empresa,
          UUID, Serie, Folio,
          Fecha, Subtotal, IVA, Total,
          Moneda, XMLURL, PDFURL, SubidoPor,
          -- Columnas nullable
          XMLContenido, RFCEmisor, NombreEmisor,
          RFCReceptor, NombreReceptor,
          Descuento, TipoCambio, FechaTimbrado,
          XMLBlobContainer, PDFBlobContainer, StorageType,
          ValidadaSAT, EstatusSAT, SATCodigoEstatus,
          SATEsCancelable, SATValidacionEFOS,
          FechaValidacionSAT, SATMensaje
        ) VALUES (
          @facturaIdLegible, @proveedor, @empresaCode,
          @uuid, @serie, @folio,
          @fechaEmision, @subtotal, @impuestos, @total,
          @moneda, @xmlRuta, @pdfRuta, @subidoPor,
          @xmlContenido, @rfcEmisor, @nombreEmisor,
          @rfcReceptor, @nombreReceptor,
          @descuento, @tipoCambio, @fechaTimbrado,
          @xmlBlobContainer, @pdfBlobContainer, @storageType,
          @satValidado, @satEstado, @satCodigoEstatus,
          @satEsCancelable, @satValidacionEFOS,
          @satFechaConsulta, @satMensaje
        )
      `);

    console.log(`✅ Factura insertada en BD: ${facturaId}`);

    // 10. Crear notificación para la empresa
    try {
      await portalPool.request()
        .input('id', sql.UniqueIdentifier, uuidv4())
        .input('portalUserId', sql.NVarChar(50), userId)
        .input('tipo', sql.NVarChar(50), 'FACTURA_NUEVA')
        .input('titulo', sql.NVarChar(200), 'Nueva factura recibida')
        .input('mensaje', sql.NVarChar(sql.MAX), `Nueva factura ${cfdiData.folio || cfdiData.uuid} por $${cfdiData.total.toFixed(2)} ${cfdiData.moneda}`)
        .input('empresaCode', sql.VarChar(50), empresaCode)
        .input('prioridad', sql.VarChar(20), 'NORMAL')
        .query(`
          INSERT INTO proveedor_notificaciones (
            id, portal_user_id, tipo, titulo, mensaje,
            empresa_code, leida, prioridad, created_at
          ) VALUES (
            @id, @portalUserId, @tipo, @titulo, @mensaje,
            @empresaCode, 0, @prioridad, GETDATE()
          )
        `);
      console.log('✅ Notificación creada');
    } catch (notifError: any) {
      console.error('⚠️ Error creando notificación:', notifError.message);
      // No fallar por esto
    }

    // 11. Retornar respuesta con información de validación SAT
    return NextResponse.json({
      success: true,
      factura: {
        id: facturaId,
        uuid: cfdiData.uuid,
        serie: cfdiData.serie,
        folio: cfdiData.folio,
        fechaEmision: cfdiData.fecha,
        rfcEmisor: cfdiData.rfcEmisor,
        nombreEmisor: cfdiData.nombreEmisor,
        rfcReceptor: cfdiData.rfcReceptor,
        nombreReceptor: cfdiData.nombreReceptor,
        subtotal: cfdiData.subTotal,
        impuestos: cfdiData.totalImpuestosTrasladados || 0,
        total: cfdiData.total,
        moneda: cfdiData.moneda,
        estatus: 'PENDIENTE',
        empresaCode
      },
      archivos: {
        xml: xmlBlobPath,
        pdf: pdfBlobPath,
        storageType: 'blob'
      },
      validacion: {
        warnings: validation.warnings
      },
      validacionSAT: {
        validado: satValidado,
        estado: satEstado,
        codigoEstatus: satCodigoEstatus,
        esCancelable: satEsCancelable,
        validacionEFOS: satValidacionEFOS,
        fechaConsulta: satFechaConsulta,
        mensaje: satMensaje || (satValidado ? 'CFDI válido ante el SAT' : 'Pendiente de validación')
      },
      remisionCompra: remisionResult.data
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [POST /api/proveedor/facturas/upload] Error:', error);
    // Garantizar que SIEMPRE se devuelva JSON válido
    try {
      return NextResponse.json({
        success: false,
        error: error?.message || 'Error al subir factura',
        details: error?.stack?.split('\n').slice(0, 3).join(' | '),
      }, { status: 500 });
    } catch {
      // Último recurso si NextResponse.json también falla
      return new Response(
        JSON.stringify({ success: false, error: 'Error interno del servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}
