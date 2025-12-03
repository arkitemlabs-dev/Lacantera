import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runJobManually, AVAILABLE_JOBS } from '@/lib/jobs/scheduler';

// POST - Ejecutar un job manualmente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // TODO: Verificar que sea admin
    // Por ahora solo verificamos que esté autenticado

    const body = await request.json();
    const { jobName } = body;

    if (!jobName) {
      return NextResponse.json(
        { error: 'jobName es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el job existe
    const jobExists = AVAILABLE_JOBS.some((job) => job.name === jobName);
    if (!jobExists) {
      return NextResponse.json(
        { error: `Job no encontrado: ${jobName}` },
        { status: 404 }
      );
    }

    // Ejecutar el job
    await runJobManually(jobName);

    return NextResponse.json({
      success: true,
      message: `Job ${jobName} ejecutado correctamente`,
    });
  } catch (error) {
    console.error('Error ejecutando job:', error);
    return NextResponse.json(
      { error: 'Error al ejecutar job' },
      { status: 500 }
    );
  }
}

// GET - Listar jobs disponibles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    return NextResponse.json({ jobs: AVAILABLE_JOBS });
  } catch (error) {
    console.error('Error obteniendo jobs:', error);
    return NextResponse.json(
      { error: 'Error al obtener jobs' },
      { status: 500 }
    );
  }
}
