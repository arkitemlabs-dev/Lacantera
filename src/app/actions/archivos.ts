'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database } from '@/lib/database';
import { parseCFDI, validateCFDI, extractEssentialData } from '@/lib/cfdi-parser';

// Subir archivo a Firebase Storage
export async function uploadFile(data: {
  file: string; // Base64
  fileName: string;
  fileType: string;
  folder: string;
}) {
  try {
    const { file, fileName, fileType, folder } = data;

    // Convertir base64 a buffer
    const base64Data = file.split(',')[1] || file;
    const buffer = Buffer.from(base64Data, 'base64');

    // Crear referencia en Storage
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${folder}/${timestamp}-${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Subir archivo
    const metadata = {
      contentType: fileType,
    };

    await uploadBytes(storageRef, buffer, metadata);

    // Obtener URL de descarga
    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      data: {
        url: downloadURL,
        path: storagePath,
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

// Subir factura completa (XML + PDF)
export async function uploadFactura(data: {
  proveedorId: string;
  xmlFile: string; // Base64
  xmlFileName: string;
  pdfFile: string; // Base64
  pdfFileName: string;
  ordenCompraId?: string;
  observaciones?: string;
}) {
  try {
    const { proveedorId, xmlFile, xmlFileName, pdfFile, pdfFileName } = data;

    // 1. Subir XML
    const xmlResult = await uploadFile({
      file: xmlFile,
      fileName: xmlFileName,
      fileType: 'text/xml',
      folder: `facturas/${proveedorId}/xml`,
    });

    if (!xmlResult.success) {
      return {
        success: false,
        error: `Error subiendo XML: ${xmlResult.error}`,
      };
    }

    // 2. Subir PDF
    const pdfResult = await uploadFile({
      file: pdfFile,
      fileName: pdfFileName,
      fileType: 'application/pdf',
      folder: `facturas/${proveedorId}/pdf`,
    });

    if (!pdfResult.success) {
      return {
        success: false,
        error: `Error subiendo PDF: ${pdfResult.error}`,
      };
    }

    // 3. Parsear el XML para extraer datos del CFDI
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

    // Validar el CFDI
    const validationResult = validateCFDI(cfdiData);
    if (!validationResult.valid) {
      return {
        success: false,
        error: `CFDI inválido: ${validationResult.errors.join(', ')}`,
      };
    }

    // Verificar que el tipo de comprobante sea Ingreso (I)
    if (cfdiData.tipoDeComprobante !== 'I') {
      return {
        success: false,
        error: `Tipo de comprobante no válido: ${cfdiData.tipoDeComprobante}. Solo se aceptan facturas de tipo Ingreso (I)`,
      };
    }

    // Extraer datos esenciales
    const essentialData = extractEssentialData(cfdiData);

    // Verificar que el UUID no esté vacío
    if (!essentialData.uuid) {
      return {
        success: false,
        error: 'El CFDI no contiene UUID válido',
      };
    }

    // Preparar datos para almacenamiento
    const facturaData = {
      facturaId: `FACT-${Date.now()}`,
      proveedorId,
      proveedorRFC: essentialData.emisorRFC,
      proveedorRazonSocial: essentialData.emisorNombre,
      receptorRFC: essentialData.receptorRFC,
      receptorRazonSocial: essentialData.receptorNombre,
      empresaId: 'empresa-1', // TODO: Obtener empresaId real del usuario
      uuid: essentialData.uuid,
      serie: essentialData.serie,
      folio: essentialData.folio,
      fecha: essentialData.fecha,
      subtotal: essentialData.subTotal,
      iva: essentialData.iva,
      total: essentialData.total,
      moneda: essentialData.moneda as 'MXN' | 'USD',
      tipoCambio: essentialData.tipoCambio,
      xmlUrl: xmlResult.data!.url,
      pdfUrl: pdfResult.data!.url,
      validadaSAT: false,
      pagada: false,
      status: 'pendiente_revision' as const,
      ordenCompraId: data.ordenCompraId,
      observaciones: data.observaciones,
      createdAt: new Date(),
      updatedAt: new Date(),
      uploadedBy: proveedorId,
    };

    // 4. Crear factura en Firestore
    const facturaId = await database.createFactura(facturaData);

    return {
      success: true,
      data: {
        facturaId,
        xmlUrl: xmlResult.data!.url,
        pdfUrl: pdfResult.data!.url,
        message: 'Factura subida exitosamente',
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
