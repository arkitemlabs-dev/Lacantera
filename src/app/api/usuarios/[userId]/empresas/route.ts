// src/app/api/usuarios/[userId]/empresas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEmpresasByUsuario } from '@/app/actions/empresas';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const result = await getEmpresasByUsuario(userId);
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error en API de empresas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
