import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createProveedorDocumento,
  getProveedorDocumentos,
  updateDocumentoEstatus,
} from '@/lib/database/sqlserver-extended';

// GET - Obtener documentos de un proveedor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const proveedor = searchParams.get('proveedor');
    const empresa = searchParams.get('empresa');

    if (!proveedor || !empresa) {
      return NextResponse.json(
        { error: 'Proveedor y empresa son requeridos' },
        { status: 400 }
      );
    }

    const documentos = await getProveedorDocumentos(proveedor, empresa);

    return NextResponse.json({ documentos });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}

// POST - Subir un nuevo documento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      proveedor,
      empresa,
      tipoDocumento,
      nombreArchivo,
      archivoURL,
      archivoTipo,
      archivoTamanio,
      fechaVencimiento,
    } = body;

    // Validaciones
    if (!proveedor || !empresa || !tipoDocumento || !nombreArchivo || !archivoURL) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const documento = await createProveedorDocumento({
      proveedor,
      usuario: session.user.name || 'DEMO', // Usuario de la sesión
      empresa,
      tipoDocumento,
      nombreArchivo,
      archivoURL,
      archivoTipo: archivoTipo || 'application/pdf',
      archivoTamanio,
      fechaVencimiento,
    });

    return NextResponse.json({ documento }, { status: 201 });
  } catch (error) {
    console.error('Error al crear documento:', error);
    return NextResponse.json(
      { error: 'Error al crear documento' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estatus de un documento
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { documentoID, estatus, comentarios } = body;

    if (!documentoID || !estatus) {
      return NextResponse.json(
        { error: 'documentoID y estatus son requeridos' },
        { status: 400 }
      );
    }

    await updateDocumentoEstatus(
      documentoID,
      estatus,
      session.user.name || 'DEMO',
      session.user.email || 'Usuario',
      comentarios
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return NextResponse.json(
      { error: 'Error al actualizar documento' },
      { status: 500 }
    );
  }
}
