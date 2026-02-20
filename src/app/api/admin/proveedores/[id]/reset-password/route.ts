// src/app/api/admin/proveedores/[id]/reset-password/route.ts
// Resetea la contraseña de un proveedor registrado en el portal

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import sql from 'mssql';
import bcrypt from 'bcrypt';

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

// Caracteres sin ambigüedad visual (sin 0/O, 1/l/I)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return result;
}

/**
 * POST /api/admin/proveedores/[id]/reset-password
 * Body: { portalUserId: string }
 * Genera una contraseña temporal y la retorna en texto plano para que el admin se la comunique al proveedor.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'super-admin' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { portalUserId } = body;

    if (!portalUserId) {
      return NextResponse.json(
        { success: false, error: 'portalUserId es requerido' },
        { status: 400 }
      );
    }

    const pool = await sql.connect(sqlConfig);

    // Buscar el usuario proveedor
    const userResult = await pool.request()
      .input('portalUserId', sql.VarChar(50), portalUserId)
      .query(`
        SELECT UsuarioWeb, Nombre, eMail
        FROM WebUsuario
        WHERE UsuarioWeb = @portalUserId AND Rol = 'proveedor'
      `);

    if (userResult.recordset.length === 0) {
      await pool.close();
      return NextResponse.json(
        { success: false, error: 'Proveedor no encontrado en el portal' },
        { status: 404 }
      );
    }

    const usuario = userResult.recordset[0];
    const tempPassword = generateTempPassword(10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await pool.request()
      .input('hash', sql.NVarChar(255), passwordHash)
      .input('portalUserId', sql.VarChar(50), portalUserId)
      .query(`
        UPDATE WebUsuario
        SET Contrasena = @hash
        WHERE UsuarioWeb = @portalUserId AND Rol = 'proveedor'
      `);

    await pool.close();

    return NextResponse.json({
      success: true,
      tempPassword,
      email: usuario.eMail,
      nombre: usuario.Nombre,
    });
  } catch (error: any) {
    console.error('[API RESET-PASSWORD] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
