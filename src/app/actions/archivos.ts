'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database } from '@/lib/database';

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

    // 3. Extraer datos del XML (simulado por ahora)
    // TODO: Implementar parser real de XML de CFDI
    const facturaData = {
      proveedorId,
      proveedorRFC: 'RFC123456789', // Extraer del XML
      proveedorRazonSocial: 'Proveedor Test', // Extraer del XML
      receptorRFC: 'LCD010101A00',
      receptorRazonSocial: 'La Cantera Desarrollos Mineros',
      empresaId: 'empresa-1',
      uuid: `UUID-${Date.now()}`, // Extraer del XML
      serie: 'A', // Extraer del XML
      folio: `${Date.now()}`, // Extraer del XML
      fecha: new Date(),
      subtotal: 1000, // Extraer del XML
      iva: 160, // Extraer del XML
      total: 1160, // Extraer del XML
      moneda: 'MXN' as const,
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
