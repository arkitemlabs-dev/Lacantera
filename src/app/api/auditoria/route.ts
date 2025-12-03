import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuditLog, getAuditLogByTabla } from '@/lib/database/sqlserver-extended';

// GET - Obtener logs de auditoría
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea admin
    // TODO: Agregar verificación de rol de admin aquí

    const searchParams = request.nextUrl.searchParams;
    const tabla = searchParams.get('tabla');
    const registroID = searchParams.get('registroID');

    if (!tabla) {
      return NextResponse.json(
        { error: 'Tabla es requerida' },
        { status: 400 }
      );
    }

    const logs = await getAuditLogByTabla(tabla, registroID || undefined);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener logs' },
      { status: 500 }
    );
  }
}

// POST - Crear registro de auditoría
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
      accion,
      tablaAfectada,
      registroID,
      valoresAnterioresJSON,
      valoresNuevosJSON,
      ipAddress,
      userAgent,
    } = body;

    if (!usuario || !usuarioNombre || !accion || !tablaAfectada || !registroID) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const log = await createAuditLog({
      usuario,
      usuarioNombre,
      empresa,
      accion,
      tablaAfectada,
      registroID,
      valoresAnterioresJSON,
      valoresNuevosJSON,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Error al crear log:', error);
    return NextResponse.json(
      { error: 'Error al crear log' },
      { status: 500 }
    );
  }
}
