// src/app/api/admin/configuracion/logo/route.ts
// API para subir el logo de la empresa

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Tipos de archivo permitidos
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * POST /api/admin/configuracion/logo
 * Sube el logo de la empresa
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    const empresaCode = formData.get('empresaCode') as string || 'CANTERA';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo no permitido. Use PNG, JPG, WEBP o SVG.' },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo excede el tamaño máximo de 2MB' },
        { status: 400 }
      );
    }

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generar nombre de archivo único
    const extension = file.name.split('.').pop() || 'png';
    const fileName = `${empresaCode.toLowerCase()}-logo-${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL pública del logo
    const logoUrl = `/uploads/logos/${fileName}`;

    console.log(`✅ Logo guardado: ${filePath}`);

    return NextResponse.json({
      success: true,
      data: {
        logoUrl,
        logoNombre: file.name,
        fileName,
      },
      message: 'Logo subido correctamente',
    });
  } catch (error: any) {
    console.error('[API LOGO] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
