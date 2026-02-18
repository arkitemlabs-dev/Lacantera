'use server';

import { database } from '@/lib/database';
import { parseCFDI, validateCFDI, extractEssentialData } from '@/lib/cfdi-parser';
import { getStoredProcedures } from '@/lib/database/stored-procedures';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { uploadBufferToBlob } from '@/lib/blob-storage';
import { buildBlobPath } from '@/lib/blob-path-builder';
import { getEmpresaERPFromTenant } from '@/lib/database/tenant-configs';

// Ruta local para guardar facturas de proveedores (necesaria para spGeneraRemisionCompra)
const FACTURAS_PROV_PATH = 'C:\\FacturasProv';

// Subir archivo a Azure Blob Storage
export async function uploadFile(data: {
  file: string; // Base64
  fileName: string;
  fileType: string;
  folder: string;
}) {
  try {
    const { file, fileName, fileType, folder } = data;

    const base64Data = file.split(',')[1] || file;
    const buffer = Buffer.from(base64Data, 'base64');

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `${folder}/${sanitizedFileName}`;

    const result = await uploadBufferToBlob(buffer, blobPath, fileType);

    return {
      success: true,
      data: {
        url: result.blobPath,
        path: result.blobPath,
        fileName: sanitizedFileName,
        container: result.container,
        storageType: 'blob' as const,
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

    // 4. Preparar parámetros para spGeneraRemisionCompra
    const serie = essentialData.serie || 'F';
    const folio = essentialData.folio || '';
    const facturaParam = `${serie}${folio ? '-' + folio : ''}`;

    // Usar el código de empresa proporcionado o fallar si no existe
    if (!data.empresaCode) {
      throw new Error('El código de empresa es requerido para procesar la factura');
    }
    const empresaCode = data.empresaCode;
    const erpEmpresa = getEmpresaERPFromTenant(empresaCode) || empresaCode;

    // 2. Subir XML a Azure Blob Storage
    const xmlContent = Buffer.from(xmlBase64Data, 'base64').toString('utf-8');
    const xmlBlobPath = buildBlobPath({
      kind: 'factura-xml',
      empresaCode: erpEmpresa,
      idProveedor: data.proveedorId,
      uuid: essentialData.uuid,
    });
    await uploadBufferToBlob(Buffer.from(xmlContent), xmlBlobPath, 'text/xml');
    console.log(`XML subido a blob: ${xmlBlobPath}`);

    // 3. Subir PDF a blob si se proporcionó
    let pdfBlobPath: string | null = null;
    if (pdfFile && pdfFileName) {
      const pdfBase64Data = pdfFile.split(',')[1] || pdfFile;
      if (pdfBase64Data) {
        const pdfBuffer = Buffer.from(pdfBase64Data, 'base64');
        pdfBlobPath = buildBlobPath({
          kind: 'factura-pdf',
          empresaCode: erpEmpresa,
          idProveedor: data.proveedorId,
          uuid: essentialData.uuid,
        });
        await uploadBufferToBlob(pdfBuffer, pdfBlobPath, 'application/pdf');
        console.log(`PDF subido a blob: ${pdfBlobPath}`);
      }
    }

    // 4. Guardar XML en C:\FacturasProv para compatibilidad con spGeneraRemisionCompra
    const safeFilename = facturaParam.replace(/[^a-zA-Z0-9-]/g, '_');
    const erpArchivo = `${safeFilename}`;
    const erpXmlPath = path.join(FACTURAS_PROV_PATH, erpArchivo);

    try {
      if (!existsSync(FACTURAS_PROV_PATH)) {
        await mkdir(FACTURAS_PROV_PATH, { recursive: true });
      }
      await writeFile(erpXmlPath, xmlContent);
      console.log(`XML guardado en: ${erpXmlPath}`);
    } catch (copyError: any) {
      console.error('Error guardando XML en C:\\FacturasProv:', copyError.message);
      // No fallamos — el blob ya tiene el archivo
    }

    // 5. Ejecutar spGeneraRemisionCompra
    const sp = getStoredProcedures();
    const remisionResult = await sp.generaRemisionCompra({
      empresa: empresaCode,
      movId: data.ordenCompraId.trim(),
      factura: facturaParam
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
        xmlPath: xmlBlobPath,
        pdfPath: pdfBlobPath,
        remision: remisionResult.data,
        storageType: 'blob',
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
  empresaCode?: string;
}) {
  try {
    const { proveedorId, tipoDocumento, file, fileName, fileType } = data;
    const erpEmpresa = data.empresaCode
      ? (getEmpresaERPFromTenant(data.empresaCode) || data.empresaCode)
      : 'general';

    const ext = path.extname(fileName).replace(/^\./, '') || 'pdf';

    // Subir a blob con ruta multi-tenant
    const blobPath = buildBlobPath({
      kind: 'documento-proveedor',
      empresaCode: erpEmpresa,
      idProveedor: proveedorId,
      tipoDocumento,
      extension: ext,
    });

    const base64Data = file.split(',')[1] || file;
    const buffer = Buffer.from(base64Data, 'base64');

    const blobResult = await uploadBufferToBlob(buffer, blobPath, fileType);

    // Crear registro de documento
    const documentoData = {
      proveedorId,
      tipoDocumento,
      archivoUrl: blobResult.blobPath,
      archivoNombre: fileName.replace(/[^a-zA-Z0-9.-]/g, '_'),
      archivoTipo: fileType,
      status: 'pendiente' as const,
      uploadedAt: new Date(),
    };

    const docId = await database.createDocumento(documentoData);

    return {
      success: true,
      data: {
        documentoId: docId,
        url: blobResult.blobPath,
        container: blobResult.container,
        storageType: 'blob',
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
