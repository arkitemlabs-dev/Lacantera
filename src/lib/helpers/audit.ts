import { createAuditLog } from '@/lib/database/sqlserver-extended';
import { NextRequest } from 'next/server';

interface AuditParams {
  usuario: string;
  usuarioNombre: string;
  empresa?: string;
  accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'APPROVE' | 'REJECT';
  tablaAfectada: string;
  registroID: string;
  valoresAnteriores?: any;
  valoresNuevos?: any;
  request?: NextRequest;
}

/**
 * Helper para registrar acciones en el audit log
 */
export async function audit(params: AuditParams) {
  try {
    const {
      usuario,
      usuarioNombre,
      empresa,
      accion,
      tablaAfectada,
      registroID,
      valoresAnteriores,
      valoresNuevos,
      request,
    } = params;

    // Obtener IP y User Agent del request si está disponible
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      ipAddress = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  undefined;
      userAgent = request.headers.get('user-agent') || undefined;
    }

    await createAuditLog({
      usuario,
      usuarioNombre,
      empresa,
      accion,
      tablaAfectada,
      registroID,
      valoresAnterioresJSON: valoresAnteriores ? JSON.stringify(valoresAnteriores) : undefined,
      valoresNuevosJSON: valoresNuevos ? JSON.stringify(valoresNuevos) : undefined,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // No fallar la operación principal si falla el audit
    console.error('Error al registrar audit log:', error);
  }
}

/**
 * Middleware helper para agregar auditoría a operaciones
 */
export function withAudit<T>(
  operation: () => Promise<T>,
  auditParams: Omit<AuditParams, 'valoresNuevos'>
): Promise<T> {
  return operation().then(async (result) => {
    await audit({
      ...auditParams,
      valoresNuevos: result,
    });
    return result;
  });
}
