import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extendedDb } from '@/lib/database/sqlserver-extended';
import { v4 as uuidv4 } from 'uuid';

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

    // Obtener IDUsuario desde session o desde la base de datos
    // TODO: Mejorar para obtener IDUsuario real desde pNetUsuario
    const idUsuario = parseInt(session.user.id || '1');

    const notificaciones = await extendedDb.getNotificacionesUsuario(
      idUsuario,
      empresa
    );

    // Filtrar solo no leídas si se solicita
    const resultado = soloNoLeidas
      ? notificaciones.filter(n => !n.leida)
      : notificaciones;

    return NextResponse.json({ notificaciones: resultado });
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

    const notificacionID = await extendedDb.createNotificacion({
      notificacionID: uuidv4(),
      idUsuario: parseInt(usuario),
      usuarioNombre,
      empresa,
      tipo,
      titulo,
      mensaje,
      link,
      datosJSON,
      leida: false,
      emailEnviado: false,
      prioridad: prioridad || 'normal',
    });

    return NextResponse.json({ notificacionID, success: true }, { status: 201 });
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

    await extendedDb.marcarNotificacionLeida(notificacionID);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    return NextResponse.json(
      { error: 'Error al marcar notificación' },
      { status: 500 }
    );
  }
}
