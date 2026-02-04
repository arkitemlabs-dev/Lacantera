'use server';

import { database } from '@/lib/database';
import { parseCFDI, validateCFDI, extractEssentialData } from '@/lib/cfdi-parser';
import { getStoredProcedures } from '@/lib/database/stored-procedures';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Ruta local para guardar facturas de proveedores
const FACTURAS_PROV_PATH = 'C:\\FacturasProv';

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

    // Para archivos generales seguimos usando una ruta relativa al proceso o una específica si se requiere
    // Pero por ahora mantenemos la lógica de carpetas
    const destDir = path.join(process.cwd(), 'uploads', folder);
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

    // 4. Preparar parámetros para spGeneraRemisionCompra
    const serie = essentialData.serie || 'F';
    const folio = essentialData.folio || '';
    const facturaParam = `${serie}${folio ? '-' + folio : ''}`;

    // Usar el código de empresa proporcionado o fallar si no existe (no asumir '01')
    if (!data.empresaCode) {
      throw new Error('El código de empresa es requerido para procesar la factura');
    }
    const empresaCode = data.empresaCode;

    // 2. Guardar XML en C:\FacturasProv usando el NOMBRE CORRECTO (Serie-Folio)
    // Esto debe coincidir con lo que espera el SP
    const safeFilename = facturaParam.replace(/[^a-zA-Z0-9-]/g, '_');
    const erpArchivo = `${safeFilename}.xml`;
    const erpXmlPath = path.join(FACTURAS_PROV_PATH, erpArchivo);

    try {
      if (!existsSync(FACTURAS_PROV_PATH)) {
        await mkdir(FACTURAS_PROV_PATH, { recursive: true });
      }
      const xmlContent = Buffer.from(xmlBase64Data, 'base64').toString('utf-8');
      await writeFile(erpXmlPath, xmlContent);
      console.log(`XML guardado en: ${erpXmlPath}`);
    } catch (copyError: any) {
      console.error('Error guardando XML:', copyError.message);
      return {
        success: false,
        error: 'Error al guardar archivo XML en C:\\FacturasProv',
      };
    }

    // 3. Guardar PDF si se proporcionó (opcional, usamos UUID para unicidad en carpeta uploads, pero aquí no es crítico para el SP)
    let pdfPath: string | null = null;
    if (pdfFile && pdfFileName) {
      const pdfBase64Data = pdfFile.split(',')[1] || pdfFile;
      if (pdfBase64Data) {
        const pdfBuffer = Buffer.from(pdfBase64Data, 'base64');
        pdfPath = path.join(FACTURAS_PROV_PATH, `${safeFilename}.pdf`); // Usamos mismo nombre base para consistencia
        await writeFile(pdfPath, pdfBuffer);
        console.log(`PDF guardado en: ${pdfPath}`);
      }
    }

    // 5. Ejecutar spGeneraRemisionCompra (Solo enviar los parámetros requeridos por el nuevo SP)
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
