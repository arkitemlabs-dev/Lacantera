// src/app/api/admin/proveedores/[id]/documentos/[docId]/archivo/route.ts
// Endpoint para obtener el contenido de un documento específico (admin)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getERPConnection } from '@/lib/database/multi-tenant-connection';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/admin/proveedores/[id]/documentos/[docId]/archivo
 * Obtiene el contenido de un documento específico
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; docId: string }> }
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

    const { id, docId } = await params;
    console.log(`[ADMIN DOCUMENTO ARCHIVO] Proveedor: ${id}, Documento IDR: ${docId}`);

    // Obtener empresa de la sesión
    const empresaActual = session.user.empresaActual;
    if (!empresaActual) {
      return NextResponse.json(
        { success: false, error: 'No hay empresa seleccionada en la sesión' },
        { status: 400 }
      );
    }

    // Conectar al ERP usando la empresa de la sesión
    const erpPool = await getERPConnection(empresaActual);

    // Obtener información del documento desde AnexoCta
    const anexoResult = await erpPool.request()
      .input('idr', sql.Int, parseInt(docId))
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
        WHERE IDR = @idr
      `);

    if (anexoResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    const anexo = anexoResult.recordset[0];
    const rutaArchivo = anexo.RutaArchivo;

    console.log(`[ADMIN DOCUMENTO ARCHIVO] Ruta del archivo: ${rutaArchivo}`);

    if (!rutaArchivo) {
      return NextResponse.json(
        { success: false, error: 'El documento no tiene archivo asociado' },
        { status: 404 }
      );
    }

    // Intentar leer el archivo desde el sistema de archivos
    try {
      // La ruta puede ser una ruta de red o local
      let rutaFinal = rutaArchivo;

      // Obtener ruta base desde variable de entorno (si está configurada)
      // Ejemplo: ERP_ANEXOS_PATH=\\\\servidor\\compartido o C:\anexos
      const erpAnexosPath = process.env.ERP_ANEXOS_PATH;

      console.log(`[ADMIN DOCUMENTO ARCHIVO] Ruta original del ERP: ${rutaArchivo}`);
      console.log(`[ADMIN DOCUMENTO ARCHIVO] ERP_ANEXOS_PATH configurado: ${erpAnexosPath || 'No configurado'}`);

      // Verificar si el archivo existe en la ruta original
      if (!fs.existsSync(rutaFinal)) {
        console.log(`[ADMIN DOCUMENTO ARCHIVO] Archivo no encontrado en ruta original: ${rutaFinal}`);

        // Extraer la parte relativa de la ruta (después de la letra de unidad)
        // Ejemplo: F:\5000v4\Anexos\2024\12\10\archivo.pdf -> 5000v4\Anexos\2024\12\10\archivo.pdf
        const rutaRelativa = rutaArchivo.replace(/^[A-Za-z]:\\/, '');
        const nombreArchivo = path.basename(rutaArchivo);

        // Intentar rutas alternativas
        const rutasAlternativas: string[] = [
          // Ruta con barras invertidas cambiadas
          rutaArchivo.replace(/\\/g, '/'),
          // Si hay ERP_ANEXOS_PATH configurado, usarlo como base
          ...(erpAnexosPath ? [
            path.join(erpAnexosPath, rutaRelativa),
            path.join(erpAnexosPath, nombreArchivo),
          ] : []),
          // Rutas de red comunes (ajustar según la configuración del servidor)
          `\\\\servidor\\anexos\\${rutaRelativa}`,
          // Rutas locales alternativas
          path.join(process.cwd(), 'public', 'documentos', nombreArchivo),
          path.join(process.cwd(), 'anexos', rutaRelativa),
          // Unidades alternativas
          `C:\\${rutaRelativa}`,
          `D:\\${rutaRelativa}`,
          `E:\\${rutaRelativa}`,
        ];

        console.log(`[ADMIN DOCUMENTO ARCHIVO] Probando ${rutasAlternativas.length} rutas alternativas...`);

        for (const rutaAlt of rutasAlternativas) {
          console.log(`[ADMIN DOCUMENTO ARCHIVO] Probando: ${rutaAlt}`);
          if (fs.existsSync(rutaAlt)) {
            rutaFinal = rutaAlt;
            console.log(`[ADMIN DOCUMENTO ARCHIVO] ✓ Archivo encontrado en: ${rutaFinal}`);
            break;
          }
        }

        if (!fs.existsSync(rutaFinal)) {
          console.log(`[ADMIN DOCUMENTO ARCHIVO] ✗ Archivo no encontrado en ninguna ruta`);
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
      console.error('[ADMIN DOCUMENTO ARCHIVO] Error leyendo archivo:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Error al leer el archivo',
        details: fileError.message,
        rutaOriginal: rutaArchivo,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[ADMIN DOCUMENTO ARCHIVO] Error:', error);
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
