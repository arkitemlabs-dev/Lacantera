// src/app/api/admin/usuarios/[id]/route.ts
// API para gestionar un usuario administrador específico

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

// Roles de administrador válidos
const ADMIN_ROLES = ['super-admin', 'admin', 'compras', 'contabilidad', 'solo-lectura'];

/**
 * GET /api/admin/usuarios/[id]
 * Obtiene un usuario específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;
    const pool = await sql.connect(sqlConfig);

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT
          UsuarioWeb as id,
          Nombre as nombre,
          eMail as email,
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
        rol: u.rol || 'super-admin',
        estatus: u.estatus === 'ACTIVO' ? 'Activo' : 'Inactivo',
      },
    });
  } catch (error: any) {
    console.error('[API USUARIO] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/usuarios/[id]
 * Actualiza un usuario (nombre, email, rol, estatus)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { nombre, email, rol, estatus, contrasena } = body;

    // Validar rol si se proporciona
    if (rol && !ADMIN_ROLES.includes(rol)) {
      return NextResponse.json(
        { success: false, error: 'Rol no válido' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Verificar que el usuario existe
    const existingUser = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT UsuarioWeb FROM WebUsuario WHERE UsuarioWeb = @id');

    if (existingUser.recordset.length === 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Si se cambia el email, verificar que no exista
    if (email) {
      const emailCheck = await pool.request()
        .input('email', sql.VarChar(100), email)
        .input('id', sql.Int, parseInt(id))
        .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email AND UsuarioWeb != @id');

      if (emailCheck.recordset.length > 0) {
        await pool.close();
        return NextResponse.json(
          { success: false, error: 'Ya existe otro usuario con ese email' },
          { status: 400 }
        );
      }
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const reqParams: any = { id: parseInt(id) };

    if (nombre) {
      updates.push('Nombre = @nombre');
      reqParams.nombre = nombre;
    }
    if (email) {
      updates.push('eMail = @email');
      reqParams.email = email;
    }
    if (rol) {
      updates.push('Rol = @rol');
      reqParams.rol = rol;
    }
    if (estatus) {
      updates.push('Estatus = @estatus');
      reqParams.estatus = estatus === 'Activo' ? 'ACTIVO' : 'INACTIVO';
    }
    if (contrasena) {
      const passwordHash = await bcrypt.hash(contrasena, 10);
      updates.push('Contrasena = @contrasena');
      reqParams.contrasena = passwordHash;
    }

    if (updates.length === 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'No hay datos para actualizar' },
        { status: 400 }
      );
    }

    const updateQuery = `UPDATE WebUsuario SET ${updates.join(', ')} WHERE UsuarioWeb = @id`;

    const updateRequest = pool.request();
    updateRequest.input('id', sql.Int, reqParams.id);
    if (reqParams.nombre) updateRequest.input('nombre', sql.NVarChar(100), reqParams.nombre);
    if (reqParams.email) updateRequest.input('email', sql.VarChar(100), reqParams.email);
    if (reqParams.rol) updateRequest.input('rol', sql.VarChar(50), reqParams.rol);
    if (reqParams.estatus) updateRequest.input('estatus', sql.VarChar(20), reqParams.estatus);
    if (reqParams.contrasena) updateRequest.input('contrasena', sql.NVarChar(255), reqParams.contrasena);

    await updateRequest.query(updateQuery);

    await pool.close();

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado correctamente',
    });
  } catch (error: any) {
    console.error('[API USUARIO] Error actualizando:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/usuarios/[id]
 * Actualización parcial (cambiar rol o estatus)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Reutiliza la lógica de PUT
  return PUT(request, { params });
}

/**
 * DELETE /api/admin/usuarios/[id]
 * Desactiva un usuario (no lo elimina físicamente)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    // No permitir que el usuario se desactive a sí mismo
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`UPDATE WebUsuario SET Estatus = 'INACTIVO' WHERE UsuarioWeb = @id`);

    await pool.close();

    return NextResponse.json({
      success: true,
      message: 'Usuario desactivado correctamente',
    });
  } catch (error: any) {
    console.error('[API USUARIO] Error eliminando:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
