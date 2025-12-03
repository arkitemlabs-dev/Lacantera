// src/lib/jobs/scheduler.ts
// Programador de tareas automáticas usando node-cron

import cron from 'node-cron';
import {
  verificarDocumentosVencidos,
  verificarDocumentosProximosVencer,
} from './documentos-vencimiento';

// ==================== TAREAS PROGRAMADAS ====================

/**
 * Inicializa todos los jobs programados
 */
export function initializeJobs() {
  console.log('[SCHEDULER] Inicializando jobs programados...');

  // Job 1: Verificar documentos vencidos
  // Se ejecuta todos los días a las 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[SCHEDULER] Ejecutando job: verificarDocumentosVencidos');
    try {
      await verificarDocumentosVencidos();
    } catch (error) {
      console.error('[SCHEDULER] Error en verificarDocumentosVencidos:', error);
    }
  });

  // Job 2: Verificar documentos próximos a vencer
  // Se ejecuta todos los días a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Ejecutando job: verificarDocumentosProximosVencer');
    try {
      await verificarDocumentosProximosVencer();
    } catch (error) {
      console.error(
        '[SCHEDULER] Error en verificarDocumentosProximosVencer:',
        error
      );
    }
  });

  // Job 3: Limpiar notificaciones antiguas
  // Se ejecuta todos los domingos a las 2:00 AM
  cron.schedule('0 2 * * 0', async () => {
    console.log('[SCHEDULER] Ejecutando job: limpiarNotificacionesAntiguas');
    try {
      await limpiarNotificacionesAntiguas();
    } catch (error) {
      console.error(
        '[SCHEDULER] Error en limpiarNotificacionesAntiguas:',
        error
      );
    }
  });

  // Job 4: Limpiar logs de auditoría antiguos
  // Se ejecuta el primer día de cada mes a las 3:00 AM
  cron.schedule('0 3 1 * *', async () => {
    console.log('[SCHEDULER] Ejecutando job: limpiarAuditLogsAntiguos');
    try {
      await limpiarAuditLogsAntiguos();
    } catch (error) {
      console.error('[SCHEDULER] Error en limpiarAuditLogsAntiguos:', error);
    }
  });

  console.log('[SCHEDULER] Jobs programados correctamente:');
  console.log('  - Verificar documentos vencidos: Diario a las 8:00 AM');
  console.log('  - Verificar documentos próximos a vencer: Diario a las 9:00 AM');
  console.log('  - Limpiar notificaciones antiguas: Domingos a las 2:00 AM');
  console.log('  - Limpiar logs de auditoría: Primer día del mes a las 3:00 AM');
}

// ==================== JOBS ADICIONALES ====================

/**
 * Limpia notificaciones leídas de más de 30 días
 */
async function limpiarNotificacionesAntiguas() {
  console.log('[JOB] Limpiando notificaciones antiguas...');

  try {
    const { getConnection } = await import('@/lib/sql-connection');
    const pool = await getConnection();

    const result = await pool.request().query(`
      DELETE FROM NotificacionPortal
      WHERE Leida = 1
        AND CreatedAt < DATEADD(day, -30, GETDATE())
    `);

    console.log(
      `[JOB] ${result.rowsAffected[0]} notificaciones antiguas eliminadas`
    );
  } catch (error) {
    console.error('[JOB] Error limpiando notificaciones:', error);
  }
}

/**
 * Limpia logs de auditoría de más de 1 año
 */
async function limpiarAuditLogsAntiguos() {
  console.log('[JOB] Limpiando logs de auditoría antiguos...');

  try {
    const { getConnection } = await import('@/lib/sql-connection');
    const pool = await getConnection();

    const result = await pool.request().query(`
      DELETE FROM AuditLog
      WHERE CreatedAt < DATEADD(year, -1, GETDATE())
        AND Accion NOT IN ('DELETE', 'REJECT')
    `);

    console.log(`[JOB] ${result.rowsAffected[0]} logs de auditoría eliminados`);
  } catch (error) {
    console.error('[JOB] Error limpiando logs de auditoría:', error);
  }
}

// ==================== EJECUTAR JOBS MANUALMENTE ====================

/**
 * Ejecuta un job específico manualmente (útil para testing)
 */
export async function runJobManually(jobName: string) {
  console.log(`[SCHEDULER] Ejecutando job manual: ${jobName}`);

  switch (jobName) {
    case 'documentos-vencidos':
      await verificarDocumentosVencidos();
      break;

    case 'documentos-proximos-vencer':
      await verificarDocumentosProximosVencer();
      break;

    case 'limpiar-notificaciones':
      await limpiarNotificacionesAntiguas();
      break;

    case 'limpiar-audit-logs':
      await limpiarAuditLogsAntiguos();
      break;

    default:
      console.error(`[SCHEDULER] Job no encontrado: ${jobName}`);
      throw new Error(`Job no encontrado: ${jobName}`);
  }
}

// ==================== UTILIDADES ====================

/**
 * Lista de jobs disponibles con sus horarios
 */
export const AVAILABLE_JOBS = [
  {
    name: 'documentos-vencidos',
    description: 'Verifica documentos vencidos y envía notificaciones',
    schedule: '0 8 * * *',
    scheduleDescription: 'Diario a las 8:00 AM',
  },
  {
    name: 'documentos-proximos-vencer',
    description: 'Verifica documentos próximos a vencer (7, 15, 30 días)',
    schedule: '0 9 * * *',
    scheduleDescription: 'Diario a las 9:00 AM',
  },
  {
    name: 'limpiar-notificaciones',
    description: 'Elimina notificaciones leídas de más de 30 días',
    schedule: '0 2 * * 0',
    scheduleDescription: 'Domingos a las 2:00 AM',
  },
  {
    name: 'limpiar-audit-logs',
    description: 'Elimina logs de auditoría de más de 1 año',
    schedule: '0 3 1 * *',
    scheduleDescription: 'Primer día del mes a las 3:00 AM',
  },
];
