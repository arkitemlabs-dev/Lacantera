// instrumentation.ts
// Archivo especial de Next.js para inicialización del servidor
// Se ejecuta automáticamente cuando el servidor inicia

export async function register() {
  // Solo ejecutar en el servidor
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[SERVER] Inicializando servidor...');

    try {
      // Importar e inicializar jobs
      if (process.env.ENABLE_SCHEDULED_JOBS === 'true') {
        const { initializeJobs } = await import('./src/lib/jobs/scheduler');
        initializeJobs();
        console.log('[SERVER] Jobs programados inicializados');
      } else {
        console.log('[SERVER] Jobs programados deshabilitados (ENABLE_SCHEDULED_JOBS=false)');
      }

      console.log('[SERVER] Servidor inicializado correctamente');
    } catch (error) {
      console.error('[SERVER] Error inicializando servidor:', error);
    }
  }
}
