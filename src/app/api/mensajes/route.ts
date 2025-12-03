import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createConversacion,
  getConversacionesByEmpresa,
  createMensaje,
  getMensajesByConversacion,
  marcarMensajeLeido,
} from '@/lib/database/sqlserver-extended';

// GET - Obtener conversaciones o mensajes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const empresa = searchParams.get('empresa');
    const conversacionID = searchParams.get('conversacionID');

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa es requerida' },
        { status: 400 }
      );
    }

    // Si hay conversacionID, obtener mensajes
    if (conversacionID) {
      const mensajes = await getMensajesByConversacion(conversacionID);
      return NextResponse.json({ mensajes });
    }

    // Si no, obtener conversaciones
    const conversaciones = await getConversacionesByEmpresa(empresa);
    return NextResponse.json({ conversaciones });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos' },
      { status: 500 }
    );
  }
}

// POST - Crear conversación o mensaje
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, ...data } = body;

    if (tipo === 'conversacion') {
      // Crear nueva conversación
      const { empresa, participantesJSON, asunto } = data;

      if (!empresa || !participantesJSON || !asunto) {
        return NextResponse.json(
          { error: 'Datos incompletos para conversación' },
          { status: 400 }
        );
      }

      const conversacion = await createConversacion({
        empresa,
        participantesJSON,
        asunto,
      });

      return NextResponse.json({ conversacion }, { status: 201 });
    } else if (tipo === 'mensaje') {
      // Crear nuevo mensaje
      const {
        conversacionID,
        remitenteID,
        remitenteNombre,
        remitenteRol,
        destinatarioID,
        destinatarioNombre,
        mensaje,
        asunto,
        archivosJSON,
      } = data;

      if (
        !conversacionID ||
        !remitenteID ||
        !remitenteNombre ||
        !remitenteRol ||
        !destinatarioID ||
        !destinatarioNombre ||
        !mensaje
      ) {
        return NextResponse.json(
          { error: 'Datos incompletos para mensaje' },
          { status: 400 }
        );
      }

      const nuevoMensaje = await createMensaje({
        conversacionID,
        remitenteID,
        remitenteNombre,
        remitenteRol,
        destinatarioID,
        destinatarioNombre,
        mensaje,
        asunto,
        archivosJSON,
      });

      return NextResponse.json({ mensaje: nuevoMensaje }, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "conversacion" o "mensaje"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error al crear:', error);
    return NextResponse.json({ error: 'Error al crear' }, { status: 500 });
  }
}

// PATCH - Marcar mensaje como leído
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { mensajeID } = body;

    if (!mensajeID) {
      return NextResponse.json(
        { error: 'mensajeID es requerido' },
        { status: 400 }
      );
    }

    await marcarMensajeLeido(mensajeID);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar mensaje:', error);
    return NextResponse.json(
      { error: 'Error al marcar mensaje' },
      { status: 500 }
    );
  }
}
