import { getServerSession } from 'next-auth';
import { authOptions } from './auth.config';
import sql from 'mssql';
import bcrypt from 'bcrypt';

// Configuración de conexión a SQL Server
const sqlConfig: sql.config = {
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  server: process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
};

let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

/**
 * Obtiene la sesión actual del usuario
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export async function hasRole(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Verifica acceso de usuario a una empresa
 */
export async function checkEmpresaAccess(userId: string, empresaId: string) {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('empresaId', sql.UniqueIdentifier, empresaId)
      .query(`
        SELECT 1 FROM usuario_empresa
        WHERE usuario_id = @userId AND empresa_id = @empresaId
      `);

    return result.recordset.length > 0;
  } catch (error) {
    console.error('Error verificando acceso a empresa:', error);
    return false;
  }
}

/**
 * Registra un nuevo usuario
 */
interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: 'proveedor' | 'admin_super' | 'admin_compras';
  userType: 'Proveedor' | 'Administrador';
  empresa: string;
  rfc?: string;
  razonSocial?: string;
}

export async function registerUser(data: RegisterData) {
  try {
    // Validaciones
    if (!data.email || !data.password || !data.role || !data.userType) {
      return {
        success: false,
        message: 'Faltan campos requeridos',
      };
    }

    if (data.password.length < 6) {
      return {
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres',
      };
    }

    const pool = await getPool();

    // Verificar si el email ya existe
    const existingUser = await pool
      .request()
      .input('email', sql.VarChar, data.email)
      .query('SELECT id FROM users WHERE email = @email');

    if (existingUser.recordset.length > 0) {
      return {
        success: false,
        message: 'El email ya está registrado',
      };
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Crear usuario
    const result = await pool
      .request()
      .input('email', sql.VarChar, data.email)
      .input('passwordHash', sql.VarChar, passwordHash)
      .input('displayName', sql.NVarChar, data.displayName)
      .input('role', sql.VarChar, data.role)
      .input('userType', sql.VarChar, data.userType)
      .input('rfc', sql.VarChar, data.rfc || null)
      .input('razonSocial', sql.NVarChar, data.razonSocial || null)
      .query(`
        INSERT INTO users (
          email,
          password_hash,
          display_name,
          role,
          user_type,
          rfc,
          razon_social,
          is_active,
          created_at
        )
        OUTPUT INSERTED.id
        VALUES (
          @email,
          @passwordHash,
          @displayName,
          @role,
          @userType,
          @rfc,
          @razonSocial,
          1,
          GETDATE()
        )
      `);

    const userId = result.recordset[0].id;

    // Asociar usuario con empresa
    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('empresaId', sql.UniqueIdentifier, data.empresa)
      .query(`
        INSERT INTO usuario_empresa (usuario_id, empresa_id, created_at)
        VALUES (@userId, @empresaId, GETDATE())
      `);

    return {
      success: true,
      uid: userId,
      message: 'Usuario creado exitosamente',
    };
  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    return {
      success: false,
      message: error.message || 'Error al crear usuario',
    };
  }
}

/**
 * Actualiza el rol de un usuario
 */
export async function updateUserRole(userId: string, newRole: string) {
  try {
    const pool = await getPool();

    await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('role', sql.VarChar, newRole)
      .query(`
        UPDATE users
        SET role = @role, updated_at = GETDATE()
        WHERE id = @userId
      `);

    return {
      success: true,
      message: 'Rol actualizado exitosamente',
    };
  } catch (error: any) {
    console.error('Error al actualizar rol:', error);
    return {
      success: false,
      message: error.message || 'Error al actualizar rol',
    };
  }
}

/**
 * Obtiene empresas asociadas a un usuario
 */
export async function getUserEmpresas(userId: string) {
  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT
          e.id,
          e.nombre_comercial,
          e.razon_social,
          e.rfc
        FROM empresas e
        INNER JOIN usuario_empresa ue ON e.id = ue.empresa_id
        WHERE ue.usuario_id = @userId
      `);

    return {
      success: true,
      data: result.recordset,
    };
  } catch (error: any) {
    console.error('Error al obtener empresas:', error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}
