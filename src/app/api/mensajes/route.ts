import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/middleware/tenant';
import { extendedDb } from '@/lib/database/sqlserver-extended';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/mensajes
 * Obtener conversaciones o mensajes de la empresa actual
 *
 * Query params:
 * - conversacionID: string (opcional - si se proporciona, devuelve mensajes de esa conversación)
 */
export const GET = withTenantContext(async (request, { tenant, user }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversacionID = searchParams.get('conversacionID');

    // Si hay conversacionID, obtener mensajes de esa conversación
    if (conversacionID) {
      const mensajes = await extendedDb.getMensajesByConversacion(conversacionID);

      return NextResponse.json({
        success: true,
        mensajes,
        total: mensajes.length,
        conversacionID
      });
    }

    // Si no, obtener todas las conversaciones de la empresa actual
    const conversaciones = await extendedDb.getConversacionesByEmpresa(
      tenant.empresaCodigo
    );

    return NextResponse.json({
      success: true,
      conversaciones,
      total: conversaciones.length,
      tenant: {
        empresa: tenant.tenantName,
        codigo: tenant.empresaCodigo
      }
    });
  } catch (error: any) {
    console.error('[API] Error al obtener datos de mensajería:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener datos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/mensajes
 * Crear conversación o mensaje en la empresa actual
 *
 * Body para conversación:
 * {
 *   tipo: "conversacion",
 *   participantesJSON: array,
 *   asunto: string
 * }
 *
 * Body para mensaje:
 * {
 *   tipo: "mensaje",
 *   conversacionID: string,
 *   remitenteID: number,
 *   remitenteNombre: string,
 *   remitenteRol: string,
 *   destinatarioID: number,
 *   destinatarioNombre: string,
 *   mensaje: string,
 *   asunto?: string,
 *   archivosJSON?: array
 * }
 */
export const POST = withTenantContext(async (request, { tenant, user }) => {
  try {
    const body = await request.json();
    const { tipo, ...data } = body;

    if (tipo === 'conversacion') {
      // Crear nueva conversación en la empresa actual
      const { participantesJSON, asunto } = data;

      if (!participantesJSON || !asunto) {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos incompletos. Se requiere: participantesJSON, asunto'
          },
          { status: 400 }
        );
      }

      const conversacion = await extendedDb.createConversacion({
        conversacionID: uuidv4(),
        empresa: tenant.empresaCodigo, // Asociar a la empresa actual del tenant
        participantesJSON,
        asunto,
        activa: true,
      });

      return NextResponse.json({
        success: true,
        conversacion,
        message: 'Conversación creada exitosamente',
        tenant: {
          empresa: tenant.tenantName,
          codigo: tenant.empresaCodigo
        }
      }, { status: 201 });

    } else if (tipo === 'mensaje') {
      // Crear nuevo mensaje en una conversación existente
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

      // Validar datos requeridos
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
          {
            success: false,
            error: 'Datos incompletos. Se requiere: conversacionID, remitenteID, remitenteNombre, remitenteRol, destinatarioID, destinatarioNombre, mensaje'
          },
          { status: 400 }
        );
      }

      // TODO: Validar que la conversación pertenezca a la empresa actual del tenant
      // antes de crear el mensaje

      const nuevoMensaje = await extendedDb.createMensaje({
        mensajeID: uuidv4(),
        conversacionID,
        remitenteID: parseInt(remitenteID),
        remitenteNombre,
        remitenteRol,
        destinatarioID: parseInt(destinatarioID),
        destinatarioNombre,
        mensaje,
        asunto,
        archivosJSON,
        leido: false,
      });

      return NextResponse.json({
        success: true,
        mensaje: nuevoMensaje,
        message: 'Mensaje enviado exitosamente'
      }, { status: 201 });

    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo inválido. Use "conversacion" o "mensaje"'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API] Error al crear:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/mensajes
 * Marcar mensaje como leído
 *
 * Body:
 * {
 *   mensajeID: string
 * }
 */
export const PATCH = withTenantContext(async (request, { tenant, user }) => {
  try {
    const body = await request.json();
    const { mensajeID } = body;

    if (!mensajeID) {
      return NextResponse.json(
        {
          success: false,
          error: 'mensajeID es requerido'
        },
        { status: 400 }
      );
    }

    // TODO: Validar que el mensaje pertenezca al usuario actual
    // antes de marcarlo como leído
    await extendedDb.marcarMensajeLeido(mensajeID);

    return NextResponse.json({
      success: true,
      message: 'Mensaje marcado como leído'
    });
  } catch (error: any) {
    console.error('[API] Error al marcar mensaje:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al marcar mensaje',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
});
