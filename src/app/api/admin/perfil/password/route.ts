// src/app/api/admin/perfil/password/route.ts
// API para cambiar la contraseña del usuario actual

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';
import bcrypt from 'bcrypt';

// Configuración de conexión
const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  server: process.env.MSSQL_SERVER!,
  database: 'PP',
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
};

/**
 * PUT /api/admin/perfil/password
 * Cambia la contraseña del usuario actual
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Contraseña actual y nueva son requeridas' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Obtener la contraseña actual del usuario
    const userResult = await pool.request()
      .input('id', sql.VarChar(50), session.user.id)
      .query('SELECT Contrasena FROM WebUsuario WHERE UsuarioWeb = @id');

    if (userResult.recordset.length === 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const currentHash = userResult.recordset[0].Contrasena;

    // Verificar la contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, currentHash);

    if (!isValidPassword) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await pool.request()
      .input('id', sql.VarChar(50), session.user.id)
      .input('contrasena', sql.NVarChar(255), newHash)
      .query(`
        UPDATE WebUsuario
        SET Contrasena = @contrasena, UltimoCambio = GETDATE()
        WHERE UsuarioWeb = @id
      `);

    await pool.close();

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error: any) {
    console.error('[API PERFIL PASSWORD] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
