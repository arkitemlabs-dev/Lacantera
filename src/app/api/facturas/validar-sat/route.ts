import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  validarCFDIconSAT,
  validarXMLCFDI,
  validarCFDIOffline,
  validarFormatoUUID,
  validarFormatoRFC,
  type DatosSAT,
} from '@/lib/helpers/sat-validation';

// POST - Validar CFDI contra el SAT
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, datos, xmlContent, validarConSAT = true } = body;

    // Tipo de validación
    if (tipo === 'datos') {
      // Validar con datos específicos
      const { uuid, rfcEmisor, rfcReceptor, total } = datos as DatosSAT;

      if (!uuid || !rfcEmisor || !rfcReceptor || !total) {
        return NextResponse.json(
          { error: 'Datos incompletos' },
          { status: 400 }
        );
      }

      // Validar formatos
      if (!validarFormatoUUID(uuid)) {
        return NextResponse.json(
          { error: 'El UUID no tiene un formato válido' },
          { status: 400 }
        );
      }

      if (!validarFormatoRFC(rfcEmisor)) {
        return NextResponse.json(
          { error: 'El RFC del emisor no tiene un formato válido' },
          { status: 400 }
        );
      }

      if (!validarFormatoRFC(rfcReceptor)) {
        return NextResponse.json(
          { error: 'El RFC del receptor no tiene un formato válido' },
          { status: 400 }
        );
      }

      // Validar contra SAT si se solicita
      if (validarConSAT) {
        const resultado = await validarCFDIconSAT({
          uuid,
          rfcEmisor,
          rfcReceptor,
          total: parseFloat(total),
        });

        return NextResponse.json({ resultado });
      } else {
        return NextResponse.json({
          resultado: {
            valido: true,
            mensaje: 'Validación de formato correcta (sin validar contra SAT)',
          },
        });
      }
    } else if (tipo === 'xml') {
      // Validar desde XML
      if (!xmlContent) {
        return NextResponse.json(
          { error: 'Contenido XML requerido' },
          { status: 400 }
        );
      }

      if (validarConSAT) {
        const resultado = await validarXMLCFDI(xmlContent);
        return NextResponse.json({ resultado });
      } else {
        const resultado = validarCFDIOffline(xmlContent);
        return NextResponse.json({ resultado });
      }
    } else {
      return NextResponse.json(
        { error: 'Tipo de validación inválido. Use "datos" o "xml"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error validando CFDI:', error);
    return NextResponse.json(
      { error: 'Error al validar CFDI' },
      { status: 500 }
    );
  }
}

// GET - Validar formato de UUID o RFC
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo');
    const valor = searchParams.get('valor');

    if (!tipo || !valor) {
      return NextResponse.json(
        { error: 'tipo y valor son requeridos' },
        { status: 400 }
      );
    }

    if (tipo === 'uuid') {
      const valido = validarFormatoUUID(valor);
      return NextResponse.json({
        valido,
        mensaje: valido
          ? 'UUID con formato válido'
          : 'UUID con formato inválido',
      });
    } else if (tipo === 'rfc') {
      const valido = validarFormatoRFC(valor);
      return NextResponse.json({
        valido,
        mensaje: valido
          ? 'RFC con formato válido'
          : 'RFC con formato inválido',
      });
    } else {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "uuid" o "rfc"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error validando formato:', error);
    return NextResponse.json(
      { error: 'Error al validar formato' },
      { status: 500 }
    );
  }
}
