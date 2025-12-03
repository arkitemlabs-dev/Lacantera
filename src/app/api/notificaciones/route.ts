import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getNotificacionesByUsuario,
  marcarNotificacionLeida,
  createNotificacion,
} from '@/lib/database/sqlserver-extended';

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const empresa = searchParams.get('empresa');
    const soloNoLeidas = searchParams.get('noLeidas') === 'true';

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa es requerida' },
        { status: 400 }
      );
    }

    const notificaciones = await getNotificacionesByUsuario(
      session.user.name || 'DEMO',
      empresa,
      soloNoLeidas
    );

    return NextResponse.json({ notificaciones });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva notificación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      usuario,
      usuarioNombre,
      empresa,
      tipo,
      titulo,
      mensaje,
      link,
      datosJSON,
      prioridad,
    } = body;

    // Validaciones
    if (!usuario || !usuarioNombre || !empresa || !tipo || !titulo || !mensaje) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const notificacion = await createNotificacion({
      usuario,
      usuarioNombre,
      empresa,
      tipo,
      titulo,
      mensaje,
      link,
      datosJSON,
      prioridad: prioridad || 'normal',
    });

    return NextResponse.json({ notificacion }, { status: 201 });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return NextResponse.json(
      { error: 'Error al crear notificación' },
      { status: 500 }
    );
  }
}

// PATCH - Marcar notificación como leída
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { notificacionID } = body;

    if (!notificacionID) {
      return NextResponse.json(
        { error: 'notificacionID es requerido' },
        { status: 400 }
      );
    }

    await marcarNotificacionLeida(notificacionID);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    return NextResponse.json(
      { error: 'Error al marcar notificación' },
      { status: 500 }
    );
  }
}
