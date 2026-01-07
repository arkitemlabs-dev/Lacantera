// src/app/api/admin/perfil/route.ts
// API para actualizar el perfil del usuario actual

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';

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
 * GET /api/admin/perfil
 * Obtiene el perfil del usuario actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('id', sql.VarChar(50), session.user.id)
      .query(`
        SELECT
          UsuarioWeb as id,
          Nombre as nombre,
          eMail as email,
          Telefono as telefono,
          Rol as rol,
          Estatus as estatus
        FROM WebUsuario
        WHERE UsuarioWeb = @id
      `);

    await pool.close();

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const u = result.recordset[0];
    return NextResponse.json({
      success: true,
      data: {
        id: String(u.id),
        nombre: u.nombre,
        email: u.email,
        telefono: u.telefono || '',
        rol: u.rol,
        estatus: u.estatus === 'ACTIVO' ? 'Activo' : 'Inactivo',
      },
    });
  } catch (error: any) {
    console.error('[API PERFIL] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/perfil
 * Actualiza el perfil del usuario actual
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, email, telefono } = body;

    if (!nombre || !email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Verificar que el email no exista en otro usuario
    const emailCheck = await pool.request()
      .input('email', sql.VarChar(100), email)
      .input('id', sql.VarChar(50), session.user.id)
      .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email AND UsuarioWeb != @id');

    if (emailCheck.recordset.length > 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'Ya existe otro usuario con ese email' },
        { status: 400 }
      );
    }

    // Actualizar el usuario
    await pool.request()
      .input('id', sql.VarChar(50), session.user.id)
      .input('nombre', sql.NVarChar(100), nombre)
      .input('email', sql.VarChar(100), email)
      .input('telefono', sql.VarChar(50), telefono || null)
      .query(`
        UPDATE WebUsuario
        SET Nombre = @nombre, eMail = @email, Telefono = @telefono
        WHERE UsuarioWeb = @id
      `);

    await pool.close();

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente',
    });
  } catch (error: any) {
    console.error('[API PERFIL] Error actualizando:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
