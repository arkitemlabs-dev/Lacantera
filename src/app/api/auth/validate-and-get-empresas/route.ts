import { NextRequest, NextResponse } from 'next/server';
import { getUserTenants } from '@/lib/database/hybrid-queries';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { getConnection } from '@/lib/sql-connection';

/**
 * POST /api/auth/validate-and-get-empresas
 * Valida credenciales y devuelve las empresas disponibles para el usuario
 *
 * Body:
 * {
 *   email: string,
 *   password: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // 1. Buscar usuario por email en la BD PP
    const pool = await getConnection('PP');

    const userResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT
          u.IDUsuario,
          u.Usuario,
          u.eMail,
          u.Nombre,
          u.IDUsuarioTipo,
          ut.Descripcion as RolDescripcion,
          u.Estatus
        FROM pNetUsuario u
        INNER JOIN pNetUsuarioTipo ut ON u.IDUsuarioTipo = ut.IDUsuarioTipo
        WHERE u.eMail = @email
          AND (u.Estatus = 'ACTIVO' OR u.Estatus = '1')
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = userResult.recordset[0];

    // 2. Verificar password
    const passwordResult = await pool.request()
      .input('userId', sql.Int, user.IDUsuario)
      .query(`
        SELECT PasswordHash
        FROM pNetUsuarioPassword
        WHERE IDUsuario = @userId
      `);

    if (passwordResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no tiene contraseña configurada. Contacte al administrador.' },
        { status: 401 }
      );
    }

    const storedHash = passwordResult.recordset[0].PasswordHash;

    // Verificar password con bcrypt
    const passwordMatch = await bcrypt.compare(password, storedHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // 3. Obtener empresas disponibles para este usuario
    const userId = user.IDUsuario.toString();
    const empresas = await getUserTenants(userId);

    if (empresas.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no tiene acceso a ninguna empresa. Contacte al administrador.' },
        { status: 403 }
      );
    }

    // 4. Devolver empresas disponibles (sin crear sesión aún)
    return NextResponse.json({
      success: true,
      message: 'Credenciales válidas',
      userId,
      empresas,
      totalEmpresas: empresas.length,
    });

  } catch (error: any) {
    console.error('[API] Error validando credenciales:', error);
    return NextResponse.json(
      {
        error: 'Error al validar credenciales',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
