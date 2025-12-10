// src/app/api/auth/update-session/route.ts
// Endpoint para actualizar la sesión (cambiar empresa)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { getSession } from 'next-auth/react';

/**
 * POST /api/auth/update-session
 * Actualiza la empresa actual del usuario en la sesión
 *
 * Body:
 * {
 *   empresaActual: "la-cantera" | "peralillo" | etc.
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      );
    }

    // Leer body
    const body = await request.json();
    const { empresaActual } = body;

    if (!empresaActual) {
      return NextResponse.json(
        {
          success: false,
          error: 'empresaActual es requerido',
        },
        { status: 400 }
      );
    }

    // Validar que el usuario tiene acceso a esta empresa
    const empresasDisponibles = session.user.empresasDisponibles || [];
    const hasAccess = empresasDisponibles.some(
      (e) => e.tenantId === empresaActual
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tiene acceso a esta empresa',
          empresaActual,
        },
        { status: 403 }
      );
    }

    // La actualización real se maneja en el callback JWT de NextAuth
    // mediante el trigger 'update'
    // El cliente debe llamar a update() del useSession

    const empresaData = empresasDisponibles.find(
      (e) => e.tenantId === empresaActual
    );

    return NextResponse.json({
      success: true,
      message: 'Sesión lista para actualizar',
      data: {
        empresaActual,
        empresaData,
        note: 'Llame a update({ empresaActual }) desde el cliente para completar',
      },
    });
  } catch (error: any) {
    console.error('[UPDATE_SESSION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar sesión',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/update-session
 * Obtiene información de la sesión actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        empresaActual: session.user.empresaActual,
        empresasDisponibles: session.user.empresasDisponibles || [],
      },
    });
  } catch (error: any) {
    console.error('[GET_SESSION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener sesión',
      },
      { status: 500 }
    );
  }
}
