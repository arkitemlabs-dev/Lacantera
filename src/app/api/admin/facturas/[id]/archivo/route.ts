// src/app/api/admin/facturas/[id]/archivo/route.ts
// Download de archivos de factura (admin) — blob-first + fallback filesystem

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';
import { generateReadSasUrl } from '@/lib/blob-storage';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/admin/facturas/[id]/archivo?tipo=xml|pdf
 * Devuelve URL de descarga (SAS) o contenido directo según storage_type
 * Solo admin/super-admin (sin filtro portal_user_id)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ success: false, error: 'No autorizado. Se requiere rol de administrador.' }, { status: 403 });
    }

    const { id } = params;
    const tipo = request.nextUrl.searchParams.get('tipo') || 'xml';

    if (tipo !== 'xml' && tipo !== 'pdf') {
      return NextResponse.json({ success: false, error: 'Tipo debe ser xml o pdf' }, { status: 400 });
    }

    const portalPool = await getPortalConnection();

    const result = await portalPool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT
          XMLURL AS xml_ruta, PDFURL AS pdf_ruta,
          XMLBlobContainer AS xml_blob_container, PDFBlobContainer AS pdf_blob_container,
          StorageType AS storage_type, XMLContenido AS xml_contenido, UUID AS uuid
        FROM ProvFacturas
        WHERE ID = @id
      `);

    if (!result.recordset || result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Factura no encontrada' }, { status: 404 });
    }

    const factura = result.recordset[0];
    const blobPath = tipo === 'xml' ? factura.xml_ruta : factura.pdf_ruta;
    const blobContainer = tipo === 'xml' ? factura.xml_blob_container : factura.pdf_blob_container;
    const storageType = factura.storage_type;

    if (!blobPath) {
      return NextResponse.json({ success: false, error: `No hay archivo ${tipo} para esta factura` }, { status: 404 });
    }

    // Blob storage — generar SAS URL
    if (storageType === 'blob') {
      const downloadUrl = generateReadSasUrl(blobPath, blobContainer || undefined);
      return NextResponse.json({
        success: true,
        data: {
          downloadUrl,
          isBlob: true,
          tipo,
          nombreArchivo: `${factura.uuid}.${tipo}`,
        },
      });
    }

    // Fallback: contenido XML desde BD
    if (tipo === 'xml' && factura.xml_contenido) {
      const buffer = Buffer.from(factura.xml_contenido, 'utf-8');
      return NextResponse.json({
        success: true,
        data: {
          contenido: buffer.toString('base64'),
          tipoMime: 'text/xml',
          nombreArchivo: `${factura.uuid}.xml`,
          tamano: buffer.length,
        },
      });
    }

    // Fallback: leer del filesystem
    if (fs.existsSync(blobPath)) {
      const contenido = fs.readFileSync(blobPath);
      const ext = path.extname(blobPath).toLowerCase();
      const tipoMime = ext === '.pdf' ? 'application/pdf' : 'text/xml';

      return NextResponse.json({
        success: true,
        data: {
          contenido: contenido.toString('base64'),
          tipoMime,
          nombreArchivo: `${factura.uuid}.${tipo}`,
          tamano: contenido.length,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Archivo no encontrado' }, { status: 404 });

  } catch (error: any) {
    console.error('[ADMIN FACTURA ARCHIVO] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener archivo', details: error.message },
      { status: 500 }
    );
  }
}
