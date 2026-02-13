import { NextRequest, NextResponse } from 'next/server';
import { getUserTenants } from '@/lib/database/hybrid-queries';
import bcrypt from 'bcrypt';
import sql from 'mssql';
import { getPortalConnection } from '@/lib/database/multi-tenant-connection';

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

    // 1. Buscar usuario por email en WebUsuario (BD PP)
    const pool = await getPortalConnection();

    const userResult = await pool.request()
      .input('email', sql.VarChar(100), email)
      .query(`
        SELECT
          UsuarioWeb,
          Nombre,
          eMail,
          Contrasena,
          Rol,
          Estatus
        FROM WebUsuario
        WHERE eMail = @email AND Estatus = 'ACTIVO'
      `);

    if (userResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = userResult.recordset[0];

    // 2. Verificar password con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.Contrasena);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // 3. Obtener empresas disponibles para este usuario
    const userId = String(user.UsuarioWeb);
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
