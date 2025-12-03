import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllTiposDocumento } from '@/lib/database/sqlserver-extended';

// GET - Obtener todos los tipos de documento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const categoria = searchParams.get('categoria');

    const tiposDocumento = await getAllTiposDocumento(categoria || undefined);

    return NextResponse.json({ tiposDocumento });
  } catch (error) {
    console.error('Error al obtener tipos de documento:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de documento' },
      { status: 500 }
    );
  }
}
