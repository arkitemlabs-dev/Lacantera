// src/lib/jobs/documentos-vencimiento.ts
// Job para verificar y notificar sobre documentos vencidos

import { sql } from '@/lib/database/sqlserver';
import {
  sendDocumentoVencidoEmail,
  sendDocumentoProximoVencerEmail,
} from '@/lib/helpers/email';
import { extendedDb } from '@/lib/database/sqlserver-extended';
import { v4 as uuidv4 } from 'uuid';

// ==================== TIPOS ====================

interface DocumentoVencimiento {
  documentoID: string;
  proveedor: string;
  usuario: string;
  empresa: string;
  tipoDocumento: string;
  nombreArchivo: string;
  fechaVencimiento: string;
  diasRestantes: number;
  email?: string;
  razonSocial?: string;
}

// ==================== FUNCIONES ====================

/**
 * Verifica documentos vencidos y envía notificaciones
 */
export async function verificarDocumentosVencidos() {
  console.log('[JOB] Iniciando verificación de documentos vencidos...');

  try {
    // Buscar documentos que vencieron y aún están en estado PENDIENTE o APROBADO
    const result = await sql`
      SELECT
        d.DocumentoID as documentoID,
        d.Proveedor as proveedor,
        d.Usuario as usuario,
        d.Empresa as empresa,
        d.TipoDocumento as tipoDocumento,
        d.NombreArchivo as nombreArchivo,
        d.FechaVencimiento as fechaVencimiento,
        DATEDIFF(day, GETDATE(), d.FechaVencimiento) as diasRestantes,
        u.Email as email,
        u.RazonSocial as razonSocial
      FROM ProvDocumentos d
      INNER JOIN UsuarioExtension u ON d.Usuario = u.Usuario
      WHERE d.FechaVencimiento IS NOT NULL
        AND d.FechaVencimiento < GETDATE()
        AND d.Estatus IN ('PENDIENTE', 'APROBADO')
      ORDER BY d.Proveedor, d.FechaVencimiento
    `;

    const documentos = result.recordset as DocumentoVencimiento[];

    if (documentos.length === 0) {
      console.log('[JOB] No hay documentos vencidos');
      return;
    }

    console.log(`[JOB] Encontrados ${documentos.length} documentos vencidos`);

    // Agrupar por proveedor
    const documentosPorProveedor = new Map<string, DocumentoVencimiento[]>();

    for (const doc of documentos) {
      const key = `${doc.proveedor}-${doc.usuario}`;
      if (!documentosPorProveedor.has(key)) {
        documentosPorProveedor.set(key, []);
      }
      documentosPorProveedor.get(key)!.push(doc);
    }

    // Procesar cada proveedor
    for (const [key, docs] of documentosPorProveedor) {
      const proveedor = docs[0];

      try {
        // Actualizar estatus a VENCIDO
        for (const doc of docs) {
          await sql`
            UPDATE ProvDocumentos
            SET
              Estatus = 'VENCIDO',
              UpdatedAt = GETDATE()
            WHERE DocumentoID = ${doc.documentoID}
          `;
        }

        // Crear notificación en el portal
        await extendedDb.createNotificacion({
          notificacionID: uuidv4(),
          idUsuario: 1, // TODO: Obtener IDUsuario real del proveedor
          usuarioNombre: proveedor.razonSocial || proveedor.usuario,
          empresa: proveedor.empresa,
          tipo: 'documento_vencido',
          titulo: 'Documentos Vencidos',
          mensaje: `Tienes ${docs.length} documento(s) vencido(s) que requieren actualización inmediata.`,
          link: '/proveedores/documentos',
          datosJSON: JSON.stringify({
            documentos: docs.map((d) => ({
              tipo: d.tipoDocumento,
              fechaVencimiento: d.fechaVencimiento,
            })),
          }),
          leida: false,
          emailEnviado: false,
          prioridad: 'critica',
        });

        // Enviar email si tiene configurado
        if (proveedor.email) {
          await sendDocumentoVencidoEmail({
            to: proveedor.email,
            proveedorNombre: proveedor.razonSocial || proveedor.usuario,
            documentosVencidos: docs.map((d) => ({
              nombreDocumento: d.nombreArchivo,
              tipoDocumento: d.tipoDocumento,
              fechaVencimiento: new Date(d.fechaVencimiento).toLocaleDateString(
                'es-MX'
              ),
            })),
          });

          console.log(
            `[JOB] Email enviado a ${proveedor.email} (${docs.length} documentos vencidos)`
          );
        }
      } catch (error) {
        console.error(
          `[JOB] Error procesando proveedor ${key}:`,
          error
        );
      }
    }

    console.log('[JOB] Verificación de documentos vencidos completada');
  } catch (error) {
    console.error('[JOB] Error en verificación de documentos vencidos:', error);
  }
}

/**
 * Verifica documentos próximos a vencer (7, 15 y 30 días)
 */
export async function verificarDocumentosProximosVencer() {
  console.log('[JOB] Iniciando verificación de documentos próximos a vencer...');

  try {
    // Buscar documentos que vencerán en 7, 15 o 30 días
    const result = await sql`
      SELECT
        d.DocumentoID as documentoID,
        d.Proveedor as proveedor,
        d.Usuario as usuario,
        d.Empresa as empresa,
        d.TipoDocumento as tipoDocumento,
        d.NombreArchivo as nombreArchivo,
        d.FechaVencimiento as fechaVencimiento,
        DATEDIFF(day, GETDATE(), d.FechaVencimiento) as diasRestantes,
        u.Email as email,
        u.RazonSocial as razonSocial
      FROM ProvDocumentos d
      INNER JOIN UsuarioExtension u ON d.Usuario = u.Usuario
      WHERE d.FechaVencimiento IS NOT NULL
        AND d.Estatus = 'APROBADO'
        AND DATEDIFF(day, GETDATE(), d.FechaVencimiento) IN (7, 15, 30)
      ORDER BY d.Proveedor, d.FechaVencimiento
    `;

    const documentos = result.recordset as DocumentoVencimiento[];

    if (documentos.length === 0) {
      console.log('[JOB] No hay documentos próximos a vencer');
      return;
    }

    console.log(
      `[JOB] Encontrados ${documentos.length} documentos próximos a vencer`
    );

    // Agrupar por proveedor
    const documentosPorProveedor = new Map<string, DocumentoVencimiento[]>();

    for (const doc of documentos) {
      const key = `${doc.proveedor}-${doc.usuario}`;
      if (!documentosPorProveedor.has(key)) {
        documentosPorProveedor.set(key, []);
      }
      documentosPorProveedor.get(key)!.push(doc);
    }

    // Procesar cada proveedor
    for (const [key, docs] of documentosPorProveedor) {
      const proveedor = docs[0];
      const minDias = Math.min(...docs.map((d) => d.diasRestantes));

      try {
        // Determinar prioridad según días restantes
        let prioridad: 'normal' | 'alta' | 'critica' = 'normal';
        if (minDias <= 7) prioridad = 'critica';
        else if (minDias <= 15) prioridad = 'alta';

        // Crear notificación en el portal
        await extendedDb.createNotificacion({
          notificacionID: uuidv4(),
          idUsuario: 1, // TODO: Obtener IDUsuario real del proveedor
          usuarioNombre: proveedor.razonSocial || proveedor.usuario,
          empresa: proveedor.empresa,
          tipo: 'documento_proximo_vencer',
          titulo: 'Documentos Próximos a Vencer',
          mensaje: `Tienes ${docs.length} documento(s) que vencerán pronto. El más próximo vence en ${minDias} días.`,
          link: '/proveedores/documentos',
          datosJSON: JSON.stringify({
            documentos: docs.map((d) => ({
              tipo: d.tipoDocumento,
              fechaVencimiento: d.fechaVencimiento,
              diasRestantes: d.diasRestantes,
            })),
          }),
          leida: false,
          emailEnviado: false,
          prioridad,
        });

        // Enviar email si tiene configurado
        if (proveedor.email) {
          await sendDocumentoProximoVencerEmail({
            to: proveedor.email,
            proveedorNombre: proveedor.razonSocial || proveedor.usuario,
            documentosProximos: docs.map((d) => ({
              nombreDocumento: d.nombreArchivo,
              tipoDocumento: d.tipoDocumento,
              fechaVencimiento: new Date(d.fechaVencimiento).toLocaleDateString(
                'es-MX'
              ),
              diasRestantes: d.diasRestantes,
            })),
          });

          console.log(
            `[JOB] Email enviado a ${proveedor.email} (${docs.length} documentos próximos a vencer)`
          );
        }
      } catch (error) {
        console.error(
          `[JOB] Error procesando proveedor ${key}:`,
          error
        );
      }
    }

    console.log('[JOB] Verificación de documentos próximos a vencer completada');
  } catch (error) {
    console.error(
      '[JOB] Error en verificación de documentos próximos a vencer:',
      error
    );
  }
}
