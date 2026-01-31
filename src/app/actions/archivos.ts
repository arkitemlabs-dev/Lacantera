'use server';

import { database } from '@/lib/database';
import { parseCFDI, validateCFDI, extractEssentialData } from '@/lib/cfdi-parser';
import { getStoredProcedures } from '@/lib/database/stored-procedures';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Ruta de red para escribir archivos desde la app
const ERP_RUTA_RED = '\\\\104.46.127.151\\PasoPruebas';
// Ruta local del servidor ERP (la que recibe el SP)
const ERP_RUTA_LOCAL = 'F:\\PasoPruebas';

// Subir archivo al filesystem local
export async function uploadFile(data: {
  file: string; // Base64
  fileName: string;
  fileType: string;
  folder: string;
}) {
  try {
    const { file, fileName, folder } = data;

    const base64Data = file.split(',')[1] || file;
    const buffer = Buffer.from(base64Data, 'base64');

    const destDir = path.join(ERP_RUTA_RED, folder);
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(destDir, sanitizedFileName);

    await writeFile(filePath, buffer);

    return {
      success: true,
      data: {
        url: filePath,
        path: filePath,
        fileName: sanitizedFileName,
      },
    };
  } catch (error: any) {
    console.error('Error subiendo archivo:', error);
    return {
      success: false,
      error: error.message || 'Error al subir archivo',
    };
  }
}

// Subir factura completa (XML + PDF opcional)
export async function uploadFactura(data: {
  proveedorId: string;
  xmlFile: string; // Base64
  xmlFileName: string;
  pdfFile: string; // Base64
  pdfFileName: string;
  ordenCompraId: string;
  empresaCode?: string;
  observaciones?: string;
}) {
  try {
    const { xmlFile, xmlFileName, pdfFile, pdfFileName } = data;

    // 1. Parsear el XML para extraer datos del CFDI
    const xmlBase64Data = xmlFile.split(',')[1] || xmlFile;
    const xmlBuffer = Buffer.from(xmlBase64Data, 'base64');
    const parseResult = parseCFDI(xmlBuffer);

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: `Error parseando CFDI: ${parseResult.error}`,
      };
    }

    const cfdiData = parseResult.data;

    const validationResult = validateCFDI(cfdiData);
    if (!validationResult.valid) {
      return {
        success: false,
        error: `CFDI inválido: ${validationResult.errors.join(', ')}`,
      };
    }

    if (cfdiData.tipoDeComprobante !== 'I') {
      return {
        success: false,
        error: `Tipo de comprobante no válido: ${cfdiData.tipoDeComprobante}. Solo se aceptan facturas de tipo Ingreso (I)`,
      };
    }

    const essentialData = extractEssentialData(cfdiData);

    if (!essentialData.uuid) {
      return {
        success: false,
        error: 'El CFDI no contiene UUID válido',
      };
    }

    // 2. Guardar XML en F:\pasopruebas
    const erpArchivo = `${essentialData.uuid}.xml`;
    const erpXmlPath = path.join(ERP_RUTA_RED, erpArchivo);

    try {
      if (!existsSync(ERP_RUTA_RED)) {
        await mkdir(ERP_RUTA_RED, { recursive: true });
      }
      const xmlContent = Buffer.from(xmlBase64Data, 'base64').toString('utf-8');
      await writeFile(erpXmlPath, xmlContent);
      console.log(`XML guardado en: ${erpXmlPath}`);
    } catch (copyError: any) {
      console.error('Error guardando XML:', copyError.message);
      return {
        success: false,
        error: 'Error al guardar archivo XML en el servidor',
      };
    }

    // 3. Guardar PDF si se proporcionó
    let pdfPath: string | null = null;
    if (pdfFile && pdfFileName) {
      const pdfBase64Data = pdfFile.split(',')[1] || pdfFile;
      if (pdfBase64Data) {
        const pdfBuffer = Buffer.from(pdfBase64Data, 'base64');
        pdfPath = path.join(ERP_RUTA_RED, `${essentialData.uuid}.pdf`);
        await writeFile(pdfPath, pdfBuffer);
        console.log(`PDF guardado en: ${pdfPath}`);
      }
    }

    // 4. Ejecutar spGeneraRemisionCompra
    const empresaCode = data.empresaCode || '01';
    const sp = getStoredProcedures();
    const remisionResult = await sp.generaRemisionCompra({
      empresa: empresaCode,
      ordenId: data.ordenCompraId.trim(),
      rutaArchivo: ERP_RUTA_LOCAL,
      archivo: erpArchivo
    });

    console.log('spGeneraRemisionCompra resultado:', remisionResult);

    if (!remisionResult.success) {
      return {
        success: false,
        error: `Error al generar remisión de compra: ${remisionResult.message}`,
      };
    }

    return {
      success: true,
      data: {
        xmlPath: erpXmlPath,
        pdfPath,
        remision: remisionResult.data,
        message: 'Factura subida y remisión generada exitosamente',
      },
    };
  } catch (error: any) {
    console.error('Error en uploadFactura:', error);
    return {
      success: false,
      error: error.message || 'Error al subir factura',
    };
  }
}

// Subir documento de proveedor
export async function uploadDocumentoProveedor(data: {
  proveedorId: string;
  tipoDocumento:
    | 'acta_constitutiva'
    | 'comprobante_domicilio'
    | 'identificacion_representante'
    | 'constancia_fiscal'
    | 'caratula_bancaria'
    | 'poder_notarial'
    | 'opinion_cumplimiento'
    | 'foto_domicilio'
    | 'referencias_comerciales'
    | 'codigo_etica'
    | 'repse'
    | 'titulo_propiedad'
    | 'pago_predial'
    | 'poliza_seguro';
  file: string;
  fileName: string;
  fileType: string;
}) {
  try {
    const { proveedorId, tipoDocumento, file, fileName, fileType } = data;

    // Subir archivo
    const uploadResult = await uploadFile({
      file,
      fileName,
      fileType,
      folder: `proveedores/${proveedorId}/documentos`,
    });

    if (!uploadResult.success) {
      return uploadResult;
    }

    // Crear registro de documento
    const documentoData = {
      proveedorId,
      tipoDocumento,
      archivoUrl: uploadResult.data!.url,
      archivoNombre: uploadResult.data!.fileName,
      archivoTipo: fileType,
      status: 'pendiente' as const,
      uploadedAt: new Date(),
    };

    const docId = await database.createDocumento(documentoData);

    return {
      success: true,
      data: {
        documentoId: docId,
        url: uploadResult.data!.url,
        message: 'Documento subido exitosamente',
      },
    };
  } catch (error: any) {
    console.error('Error subiendo documento:', error);
    return {
      success: false,
      error: error.message || 'Error al subir documento',
    };
  }
}
