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

    // 5. Validar estructura CFDI
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

    if (validation.warnings.length > 0) {
      console.log('⚠️ Advertencias:', validation.warnings);
    }

    // 6. Validar que el RFC emisor coincide con el proveedor
    // Nota: Esto depende de que tengamos el RFC en el mapping o en la tabla Prov del ERP
    // Por ahora solo validamos que el UUID no esté duplicado

    // 7. Verificar que UUID no esté duplicado
    const duplicadoResult = await portalPool.request()
      .input('uuid', sql.VarChar(36), cfdiData.uuid)
      .query(`
        SELECT id
        FROM proveedor_facturas
        WHERE uuid = @uuid
      `);

    if (duplicadoResult.recordset && duplicadoResult.recordset.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Esta factura ya fue subida previamente',
        uuid: cfdiData.uuid
      }, { status: 409 }); // 409 Conflict
    }

    // 7.5. Validar CFDI con el SAT
    console.log('🔍 Validando CFDI con el SAT...');
    let validacionSAT = null;
    let satValidado = false;
    let satEstado = 'PENDIENTE';
    let satMensaje = '';

    try {
      validacionSAT = await validacionCompletaSAT({
        uuid: cfdiData.uuid,
        rfcEmisor: cfdiData.rfcEmisor,
        rfcReceptor: cfdiData.rfcReceptor,
        total: cfdiData.total
      });

      satValidado = validacionSAT.aprobada;
      satEstado = validacionSAT.validacionCFDI.estado;
      satMensaje = validacionSAT.motivo || '';

      console.log(`   Estado SAT: ${satEstado}`);
      console.log(`   Aprobada: ${satValidado}`);

      // Si la factura está cancelada en el SAT, rechazar
      if (validacionSAT.validacionCFDI.estado === 'Cancelado') {
        return NextResponse.json({
          success: false,
          error: 'La factura está CANCELADA en el SAT',
          validacionSAT: {
            estado: validacionSAT.validacionCFDI.estado,
            codigoEstatus: validacionSAT.validacionCFDI.codigoEstatus,
            fechaConsulta: validacionSAT.validacionCFDI.fechaConsulta
          }
        }, { status: 400 });
      }

      // Si el emisor está en lista negra (EFOS), rechazar
      if (validacionSAT.validacionEmisor?.enLista) {
        return NextResponse.json({
          success: false,
          error: 'El RFC del emisor está en la lista de contribuyentes incumplidos del SAT',
          validacionSAT: {
            emisorEnListaNegra: true,
            tipo: validacionSAT.validacionEmisor.tipo
          }
        }, { status: 400 });
      }

    } catch (satError: any) {
      // Si falla la validación SAT, continuar pero marcar como pendiente
      console.error('⚠️ Error en validación SAT (se continuará con estado pendiente):', satError.message);
      satEstado = 'PENDIENTE';
      satMensaje = `Error al validar con SAT: ${satError.message}`;
    }

    // 8. Guardar archivos en el servidor
    const uploadDir = path.join(process.cwd(), 'uploads', 'facturas', empresaCode, cfdiData.uuid);

    // Crear directorio si no existe
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Guardar XML
    const xmlPath = path.join(uploadDir, `${cfdiData.uuid}.xml`);
    await writeFile(xmlPath, xmlString);
    console.log(`✅ XML guardado: ${xmlPath}`);

    // Guardar PDF si existe
    let pdfPath = null;
    let pdfTamano = null;
    if (pdfFile) {
      const pdfBuffer = await pdfFile.arrayBuffer();
      pdfPath = path.join(uploadDir, `${cfdiData.uuid}.pdf`);
      await writeFile(pdfPath, Buffer.from(pdfBuffer));
      pdfTamano = pdfBuffer.byteLength;
      console.log(`✅ PDF guardado: ${pdfPath}`);
    }

    // 9. Insertar en base de datos (tabla proveedor_facturas)
    const facturaId = uuidv4();
    const xmlTamano = xmlBuffer.byteLength;

    // Preparar datos de validación SAT para BD
    const satCodigoEstatus = validacionSAT?.validacionCFDI?.codigoEstatus || null;
    const satEsCancelable = validacionSAT?.validacionCFDI?.esCancelable || null;
    const satValidacionEFOS = validacionSAT?.validacionCFDI?.validacionEFOS || null;
    const satFechaConsulta = validacionSAT?.validacionCFDI?.fechaConsulta || null;

    await portalPool.request()
      .input('id', sql.UniqueIdentifier, facturaId)
      .input('portalUserId', sql.NVarChar(50), userId)
      .input('empresaCode', sql.VarChar(50), empresaCode)
      .input('uuid', sql.VarChar(36), cfdiData.uuid)
      .input('serie', sql.VarChar(25), cfdiData.serie || null)
      .input('folio', sql.VarChar(40), cfdiData.folio || null)
      .input('fechaEmision', sql.DateTime2, new Date(cfdiData.fecha))
      .input('fechaTimbrado', sql.DateTime2, new Date(cfdiData.fechaTimbrado))
      .input('rfcEmisor', sql.VarChar(13), cfdiData.rfcEmisor)
      .input('nombreEmisor', sql.NVarChar(250), cfdiData.nombreEmisor)
      .input('rfcReceptor', sql.VarChar(13), cfdiData.rfcReceptor)
      .input('nombreReceptor', sql.NVarChar(250), cfdiData.nombreReceptor)
      .input('subtotal', sql.Decimal(18, 2), cfdiData.subTotal)
      .input('descuento', sql.Decimal(18, 2), cfdiData.descuento || 0)
      .input('impuestos', sql.Decimal(18, 2), cfdiData.totalImpuestosTrasladados || 0)
      .input('total', sql.Decimal(18, 2), cfdiData.total)
      .input('moneda', sql.VarChar(3), cfdiData.moneda)
      .input('tipoCambio', sql.Decimal(10, 4), cfdiData.tipoCambio || 1)
      .input('xmlContenido', sql.NVarChar(sql.MAX), xmlString)
      .input('xmlRuta', sql.VarChar(500), xmlPath)
      .input('pdfRuta', sql.VarChar(500), pdfPath)
      .input('xmlTamano', sql.Int, xmlTamano)
      .input('pdfTamano', sql.Int, pdfTamano)
      // Campos de validación SAT
      .input('satValidado', sql.Bit, satValidado ? 1 : 0)
      .input('satEstado', sql.VarChar(50), satEstado)
      .input('satCodigoEstatus', sql.VarChar(100), satCodigoEstatus)
      .input('satEsCancelable', sql.VarChar(50), satEsCancelable)
      .input('satValidacionEFOS', sql.VarChar(100), satValidacionEFOS)
      .input('satFechaConsulta', sql.DateTime2, satFechaConsulta)
      .input('satMensaje', sql.NVarChar(500), satMensaje)
      .query(`
        INSERT INTO proveedor_facturas (
          id, portal_user_id, empresa_code,
          uuid, serie, folio,
          fecha_emision, fecha_timbrado,
          rfc_emisor, nombre_emisor,
          rfc_receptor, nombre_receptor,
          subtotal, descuento, impuestos, total,
          moneda, tipo_cambio,
          xml_contenido, xml_ruta, pdf_ruta,
          xml_tamano, pdf_tamano,
          sat_validado, sat_estado, sat_codigo_estatus,
          sat_es_cancelable, sat_validacion_efos,
          sat_fecha_consulta, sat_mensaje,
          estatus, created_at, updated_at
        ) VALUES (
          @id, @portalUserId, @empresaCode,
          @uuid, @serie, @folio,
          @fechaEmision, @fechaTimbrado,
          @rfcEmisor, @nombreEmisor,
          @rfcReceptor, @nombreReceptor,
          @subtotal, @descuento, @impuestos, @total,
          @moneda, @tipoCambio,
          @xmlContenido, @xmlRuta, @pdfRuta,
          @xmlTamano, @pdfTamano,
          @satValidado, @satEstado, @satCodigoEstatus,
          @satEsCancelable, @satValidacionEFOS,
          @satFechaConsulta, @satMensaje,
          'PENDIENTE', GETDATE(), GETDATE()
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
        xml: xmlPath,
        pdf: pdfPath,
        xmlTamano,
        pdfTamano
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
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [POST /api/proveedor/facturas/upload] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al subir factura',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
