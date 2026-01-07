// src/app/api/admin/usuarios/route.ts
// API para gestionar usuarios administradores

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
 * GET /api/admin/usuarios
 * Obtiene lista de usuarios administradores (no proveedores)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo super-admin puede ver usuarios
    if (session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const pool = await sql.connect(sqlConfig);

    // Obtener usuarios que NO son proveedores
    const result = await pool.request().query(`
      SELECT
        UsuarioWeb as id,
        Nombre as nombre,
        eMail as email,
        Rol as rol,
        Estatus as estatus,
        FechaRegistro as fechaCreacion
      FROM WebUsuario
      WHERE Proveedor IS NULL
        AND (Rol IS NULL OR Rol NOT IN ('proveedor'))
      ORDER BY Nombre
    `);

    const usuarios = result.recordset.map((u: any) => ({
      id: String(u.id),
      nombre: u.nombre || 'Sin nombre',
      email: u.email,
      rol: u.rol || 'super-admin',
      estatus: u.estatus === 'ACTIVO' ? 'Activo' : 'Inactivo',
      fechaCreacion: u.fechaCreacion,
    }));

    await pool.close();

    return NextResponse.json({
      success: true,
      data: usuarios,
    });
  } catch (error: any) {
    console.error('[API USUARIOS] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/usuarios
 * Crea un nuevo usuario administrador
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, email, rol, contrasena } = body;

    // Validaciones
    if (!nombre || !email || !rol || !contrasena) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (!ADMIN_ROLES.includes(rol)) {
      return NextResponse.json(
        { success: false, error: 'Rol no válido' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Verificar si el email ya existe
    const existingUser = await pool.request()
      .input('email', sql.VarChar(100), email)
      .query('SELECT UsuarioWeb FROM WebUsuario WHERE eMail = @email');

    if (existingUser.recordset.length > 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'Ya existe un usuario con ese email' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(contrasena, 10);

    // Insertar usuario
    const insertResult = await pool.request()
      .input('nombre', sql.NVarChar(100), nombre)
      .input('email', sql.VarChar(100), email)
      .input('rol', sql.VarChar(50), rol)
      .input('contrasena', sql.NVarChar(255), passwordHash)
      .query(`
        INSERT INTO WebUsuario (Nombre, eMail, Rol, Contrasena, Estatus, FechaRegistro)
        OUTPUT INSERTED.UsuarioWeb
        VALUES (@nombre, @email, @rol, @contrasena, 'ACTIVO', GETDATE())
      `);

    const newUserId = insertResult.recordset[0].UsuarioWeb;

    await pool.close();

    return NextResponse.json({
      success: true,
      data: {
        id: String(newUserId),
        nombre,
        email,
        rol,
        estatus: 'Activo',
      },
      message: 'Usuario creado correctamente',
    });
  } catch (error: any) {
    console.error('[API USUARIOS] Error creando usuario:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
