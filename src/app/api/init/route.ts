// src/app/api/init/route.ts
// API Route para inicializar el servidor
// Este endpoint se llama automáticamente al iniciar la aplicación

import { NextResponse } from 'next/server';
import '../../../lib/init-server'; // Importar para ejecutar la inicialización

export const dynamic = 'force-dynamic';

/**
 * Endpoint de health check que también verifica la inicialización
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Servidor inicializado',
    jobs: process.env.ENABLE_SCHEDULED_JOBS === 'true' ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString(),
  });
}
