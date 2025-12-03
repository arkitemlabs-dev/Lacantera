// src/lib/init-server.ts
// Inicialización de servicios del servidor
// Este archivo se ejecuta una sola vez al iniciar el servidor

import { initializeJobs } from './jobs/scheduler';

let initialized = false;

/**
 * Inicializa todos los servicios del servidor
 */
export function initializeServer() {
  // Evitar múltiples inicializaciones
  if (initialized) {
    console.log('[INIT] Servidor ya inicializado, saltando...');
    return;
  }

  console.log('[INIT] Inicializando servicios del servidor...');

  try {
    // Inicializar jobs programados si están habilitados
    if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
      console.log('[INIT] Inicializando jobs programados...');
      initializeJobs();
    } else {
      console.log('[INIT] Jobs programados deshabilitados');
    }

    initialized = true;
    console.log('[INIT] Servidor inicializado correctamente');
  } catch (error) {
    console.error('[INIT] Error inicializando servidor:', error);
  }
}

// Auto-inicializar en el servidor
if (typeof window === 'undefined') {
  initializeServer();
}
