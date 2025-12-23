import { NextResponse } from 'next/server';
import { debugGetAllConversaciones, debugFixConversacion } from '@/app/actions/mensajes';

export async function GET() {
  try {
    const result = await debugGetAllConversaciones();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST para corregir una conversación
// Body: { conversacionId: "1", oldUserId: "P00443", newUserId: "5" }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversacionId, oldUserId, newUserId, newUserName } = body;

    if (!conversacionId || !oldUserId || !newUserId) {
      return NextResponse.json(
        { error: 'Faltan parámetros: conversacionId, oldUserId, newUserId' },
        { status: 400 }
      );
    }

    const result = await debugFixConversacion(conversacionId, oldUserId, newUserId, newUserName);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
