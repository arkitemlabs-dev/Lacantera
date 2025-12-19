// src/app/api/proveedor/documentos/[docId]/archivo/route.ts
// Endpoint para obtener el contenido de un documento específico (proveedor)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/proveedor/documentos/[docId]/archivo
 * Obtiene el contenido de un documento específico del proveedor autenticado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { docId } = await params;
    const codigoProveedor = session.user.proveedor;

    console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] Proveedor: ${codigoProveedor}, Documento IDR: ${docId}`);

    if (!codigoProveedor) {
      return NextResponse.json(
        { success: false, error: 'No se encontró código de proveedor en la sesión' },
        { status: 400 }
      );
    }

    // Conectar al ERP
    const erpPool = await getERPConnection('la-cantera');

    // Obtener información del documento desde AnexoCta
    // Verificar que el documento pertenezca al proveedor autenticado
    const anexoResult = await erpPool.request()
      .input('idr', sql.Int, parseInt(docId))
      .input('cuenta', sql.VarChar(20), codigoProveedor)
      .query(`
        SELECT
          IDR,
          Rama,
          Cuenta,
          Nombre AS NombreDocumento,
          Direccion AS RutaArchivo,
          Documento,
          Alta AS FechaAlta
        FROM AnexoCta
        WHERE IDR = @idr AND Cuenta = @cuenta
      `);

    if (anexoResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado o no pertenece a este proveedor' },
        { status: 404 }
      );
    }

    const anexo = anexoResult.recordset[0];
    const rutaArchivo = anexo.RutaArchivo;

    console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] Ruta del archivo: ${rutaArchivo}`);

    if (!rutaArchivo) {
      return NextResponse.json(
        { success: false, error: 'El documento no tiene archivo asociado' },
        { status: 404 }
      );
    }

    // Intentar leer el archivo desde el sistema de archivos
    try {
      let rutaFinal = rutaArchivo;

      // Obtener ruta base desde variable de entorno (si está configurada)
      const erpAnexosPath = process.env.ERP_ANEXOS_PATH;

      console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] Ruta original del ERP: ${rutaArchivo}`);
      console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] ERP_ANEXOS_PATH configurado: ${erpAnexosPath || 'No configurado'}`);

      // Verificar si el archivo existe en la ruta original
      if (!fs.existsSync(rutaFinal)) {
        console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] Archivo no encontrado en ruta original: ${rutaFinal}`);

        // Extraer la parte relativa de la ruta (después de la letra de unidad)
        const rutaRelativa = rutaArchivo.replace(/^[A-Za-z]:\\/, '');
        const nombreArchivo = path.basename(rutaArchivo);

        // Intentar rutas alternativas
        const rutasAlternativas: string[] = [
          rutaArchivo.replace(/\\/g, '/'),
          ...(erpAnexosPath ? [
            path.join(erpAnexosPath, rutaRelativa),
            path.join(erpAnexosPath, nombreArchivo),
          ] : []),
          `\\\\servidor\\anexos\\${rutaRelativa}`,
          path.join(process.cwd(), 'public', 'documentos', nombreArchivo),
          path.join(process.cwd(), 'anexos', rutaRelativa),
          `C:\\${rutaRelativa}`,
          `D:\\${rutaRelativa}`,
          `E:\\${rutaRelativa}`,
        ];

        for (const rutaAlt of rutasAlternativas) {
          if (fs.existsSync(rutaAlt)) {
            rutaFinal = rutaAlt;
            console.log(`[PROVEEDOR DOCUMENTO ARCHIVO] ✓ Archivo encontrado en: ${rutaFinal}`);
            break;
          }
        }

        if (!fs.existsSync(rutaFinal)) {
          return NextResponse.json({
            success: false,
            error: 'Archivo no encontrado en el servidor',
            rutaOriginal: rutaArchivo,
            sugerencia: 'Configure la variable de entorno ERP_ANEXOS_PATH con la ruta base donde se encuentran los anexos del ERP',
          }, { status: 404 });
        }
      }

      // Leer el archivo
      const contenido = fs.readFileSync(rutaFinal);
      const contenidoBase64 = contenido.toString('base64');

      // Determinar el tipo MIME
      const extension = path.extname(rutaFinal).toLowerCase();
      const tiposMime: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const tipoMime = tiposMime[extension] || 'application/octet-stream';

      return NextResponse.json({
        success: true,
        data: {
          contenido: contenidoBase64,
          tipoMime,
          nombreArchivo: anexo.NombreDocumento || path.basename(rutaFinal),
          tamaño: contenido.length,
        },
      });

    } catch (fileError: any) {
      console.error('[PROVEEDOR DOCUMENTO ARCHIVO] Error leyendo archivo:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Error al leer el archivo',
        details: fileError.message,
        rutaOriginal: rutaArchivo,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[PROVEEDOR DOCUMENTO ARCHIVO] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el documento',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
