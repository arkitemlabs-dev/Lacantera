'use server';

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

let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

// ==================== CREAR TABLA DE HISTORIAL DE SESIONES ====================

async function ensureSesionHistorialTable() {
  const pool = await getPool();

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WebSesionHistorial' AND xtype='U')
    CREATE TABLE WebSesionHistorial (
      ID INT IDENTITY(1,1) PRIMARY KEY,
      UsuarioId NVARCHAR(100) NOT NULL,
      FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
      DireccionIP NVARCHAR(50),
      UserAgent NVARCHAR(500),
      Ubicacion NVARCHAR(200),
      Dispositivo NVARCHAR(100),
      Navegador NVARCHAR(100),
      SistemaOperativo NVARCHAR(100),
      Exitoso BIT NOT NULL DEFAULT 1,
      MotivoFallo NVARCHAR(200)
    )
  `);

  // Crear índice para búsquedas por usuario
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_WebSesionHistorial_UsuarioId')
    CREATE INDEX IX_WebSesionHistorial_UsuarioId ON WebSesionHistorial(UsuarioId, FechaHora DESC)
  `);
}

// ==================== AGREGAR CAMPOS A WEBUSUARIO SI NO EXISTEN ====================

async function ensureWebUsuarioFields() {
  const pool = await getPool();

  // Agregar eMailRecuperacion si no existe
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'eMailRecuperacion'
    )
    ALTER TABLE WebUsuario ADD eMailRecuperacion NVARCHAR(100) NULL
  `);

  // Agregar Autenticacion2FA si no existe
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'Autenticacion2FA'
    )
    ALTER TABLE WebUsuario ADD Autenticacion2FA BIT DEFAULT 0
  `);

  // Agregar FechaModificacion si no existe
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('WebUsuario') AND name = 'FechaModificacion'
    )
    ALTER TABLE WebUsuario ADD FechaModificacion DATETIME NULL
  `);
}

// ==================== REGISTRAR INICIO DE SESIÓN ====================

export interface DatosSesion {
  usuarioId: string;
  ip?: string;
  userAgent?: string;
  exitoso?: boolean;
  motivoFallo?: string;
}

function parseUserAgent(userAgent: string): { dispositivo: string; navegador: string; sistemaOperativo: string } {
  let dispositivo = 'Desconocido';
  let navegador = 'Desconocido';
  let sistemaOperativo = 'Desconocido';

  // Detectar sistema operativo
  if (userAgent.includes('Windows NT 10')) {
    sistemaOperativo = 'Windows 10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    sistemaOperativo = 'Windows 8.1';
  } else if (userAgent.includes('Windows NT 6.1')) {
    sistemaOperativo = 'Windows 7';
  } else if (userAgent.includes('Mac OS X')) {
    sistemaOperativo = 'macOS';
  } else if (userAgent.includes('Linux')) {
    sistemaOperativo = 'Linux';
  } else if (userAgent.includes('Android')) {
    sistemaOperativo = 'Android';
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    sistemaOperativo = 'iOS';
  }

  // Detectar navegador
  if (userAgent.includes('Edg/')) {
    navegador = 'Microsoft Edge';
  } else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    navegador = 'Google Chrome';
  } else if (userAgent.includes('Firefox/')) {
    navegador = 'Mozilla Firefox';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    navegador = 'Safari';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    navegador = 'Opera';
  }

  // Detectar dispositivo
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    dispositivo = 'Móvil';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    dispositivo = 'Tablet';
  } else {
    dispositivo = 'Escritorio';
  }

  return { dispositivo, navegador, sistemaOperativo };
}

export async function registrarInicioSesion(datos: DatosSesion) {
  try {
    await ensureSesionHistorialTable();
    const pool = await getPool();

    const { dispositivo, navegador, sistemaOperativo } = datos.userAgent
      ? parseUserAgent(datos.userAgent)
      : { dispositivo: 'Desconocido', navegador: 'Desconocido', sistemaOperativo: 'Desconocido' };

    await pool.request()
      .input('usuarioId', sql.NVarChar(100), datos.usuarioId)
      .input('ip', sql.NVarChar(50), datos.ip || 'Desconocida')
      .input('userAgent', sql.NVarChar(500), datos.userAgent || '')
      .input('dispositivo', sql.NVarChar(100), dispositivo)
      .input('navegador', sql.NVarChar(100), navegador)
      .input('sistemaOperativo', sql.NVarChar(100), sistemaOperativo)
      .input('exitoso', sql.Bit, datos.exitoso !== false ? 1 : 0)
      .input('motivoFallo', sql.NVarChar(200), datos.motivoFallo || null)
      .query(`
        INSERT INTO WebSesionHistorial (
          UsuarioId, DireccionIP, UserAgent, Dispositivo, Navegador, SistemaOperativo, Exitoso, MotivoFallo
        ) VALUES (
          @usuarioId, @ip, @userAgent, @dispositivo, @navegador, @sistemaOperativo, @exitoso, @motivoFallo
        )
      `);

    return { success: true };
  } catch (error: any) {
    console.error('Error registrando inicio de sesión:', error);
    return { success: false, error: error.message };
  }
}

// ==================== OBTENER HISTORIAL DE SESIONES ====================

export interface SesionHistorial {
  id: number;
  fechaHora: Date;
  direccionIP: string;
  dispositivo: string;
  navegador: string;
  sistemaOperativo: string;
  exitoso: boolean;
}

export async function getHistorialSesiones(usuarioId: string, limit: number = 20) {
  try {
    await ensureSesionHistorialTable();
    const pool = await getPool();

    const result = await pool.request()
      .input('usuarioId', sql.NVarChar(100), usuarioId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          ID,
          FechaHora,
          DireccionIP,
          Dispositivo,
          Navegador,
          SistemaOperativo,
          Exitoso
        FROM WebSesionHistorial
        WHERE UsuarioId = @usuarioId
        ORDER BY FechaHora DESC
      `);

    const historial: SesionHistorial[] = result.recordset.map((row: any) => ({
      id: row.ID,
      fechaHora: row.FechaHora,
      direccionIP: row.DireccionIP || 'Desconocida',
      dispositivo: row.Dispositivo || 'Desconocido',
      navegador: row.Navegador || 'Desconocido',
      sistemaOperativo: row.SistemaOperativo || 'Desconocido',
      exitoso: row.Exitoso === true || row.Exitoso === 1,
    }));

    return { success: true, data: historial };
  } catch (error: any) {
    console.error('Error obteniendo historial de sesiones:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// ==================== CAMBIAR CONTRASEÑA ====================

export async function cambiarContrasena(data: {
  usuarioId: string;
  contrasenaActual: string;
  nuevaContrasena: string;
}) {
  try {
    const pool = await getPool();

    // Obtener la contraseña actual del usuario
    const userResult = await pool.request()
      .input('usuarioId', sql.Int, parseInt(data.usuarioId))
      .query(`
        SELECT UsuarioWeb, Contrasena, eMail
        FROM WebUsuario
        WHERE UsuarioWeb = @usuarioId AND Estatus = 'ACTIVO'
      `);

    if (userResult.recordset.length === 0) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const user = userResult.recordset[0];

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(data.contrasenaActual, user.Contrasena);

    if (!isValidPassword) {
      return { success: false, error: 'La contraseña actual es incorrecta' };
    }

    // Validar nueva contraseña
    if (data.nuevaContrasena.length < 8) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(data.nuevaContrasena, user.Contrasena);
    if (isSamePassword) {
      return { success: false, error: 'La nueva contraseña debe ser diferente a la actual' };
    }

    // Generar hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(data.nuevaContrasena, 10);

    // Actualizar contraseña (sin usar FechaModificacion por si no existe)
    await pool.request()
      .input('usuarioId', sql.Int, parseInt(data.usuarioId))
      .input('newPassword', sql.NVarChar(255), newPasswordHash)
      .query(`
        UPDATE WebUsuario
        SET Contrasena = @newPassword
        WHERE UsuarioWeb = @usuarioId
      `);

    console.log(`[SEGURIDAD] Contraseña cambiada para usuario ${data.usuarioId}`);

    return { success: true, message: 'Contraseña actualizada correctamente' };
  } catch (error: any) {
    console.error('Error cambiando contraseña:', error);
    return { success: false, error: 'Error al cambiar la contraseña. Intente de nuevo.' };
  }
}

// ==================== ACTUALIZAR EMAIL DE RECUPERACIÓN ====================

export async function actualizarEmailRecuperacion(usuarioId: string, nuevoEmail: string) {
  try {
    const pool = await getPool();

    // Intentar agregar campos si no existen
    try {
      await ensureWebUsuarioFields();
    } catch (e) {
      console.log('[SEGURIDAD] No se pudieron agregar campos');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoEmail)) {
      return { success: false, error: 'El formato del email no es válido' };
    }

    // Verificar si el campo existe
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'WebUsuario' AND COLUMN_NAME = 'eMailRecuperacion'
    `);

    if (columnsResult.recordset.length === 0) {
      return { success: false, error: 'La funcionalidad de email de recuperación no está disponible aún' };
    }

    // Verificar que el email no esté en uso por otro usuario
    const existingResult = await pool.request()
      .input('email', sql.NVarChar(100), nuevoEmail)
      .input('usuarioId', sql.Int, parseInt(usuarioId))
      .query(`
        SELECT UsuarioWeb FROM WebUsuario
        WHERE eMailRecuperacion = @email AND UsuarioWeb != @usuarioId
      `);

    if (existingResult.recordset.length > 0) {
      return { success: false, error: 'Este email ya está registrado como email de recuperación de otro usuario' };
    }

    // Actualizar email de recuperación
    await pool.request()
      .input('usuarioId', sql.Int, parseInt(usuarioId))
      .input('email', sql.NVarChar(100), nuevoEmail)
      .query(`
        UPDATE WebUsuario
        SET eMailRecuperacion = @email
        WHERE UsuarioWeb = @usuarioId
      `);

    return { success: true, message: 'Email de recuperación actualizado correctamente' };
  } catch (error: any) {
    console.error('Error actualizando email de recuperación:', error);
    return { success: false, error: 'Error al actualizar el email de recuperación' };
  }
}

// ==================== OBTENER DATOS DE SEGURIDAD DEL USUARIO ====================

export async function getDatosSeguridad(usuarioId: string) {
  try {
    const pool = await getPool();

    // Intentar agregar campos si no existen (sin fallar si ya existen)
    try {
      await ensureWebUsuarioFields();
    } catch (e) {
      console.log('[SEGURIDAD] Campos ya existen o no se pudieron agregar');
    }

    // Primero verificar qué campos existen en la tabla
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'WebUsuario'
      AND COLUMN_NAME IN ('eMailRecuperacion', 'Autenticacion2FA')
    `);

    const existingColumns = columnsResult.recordset.map((r: any) => r.COLUMN_NAME);
    const hasEmailRecuperacion = existingColumns.includes('eMailRecuperacion');
    const has2FA = existingColumns.includes('Autenticacion2FA');

    // Construir query dinámicamente basado en columnas existentes
    let selectFields = 'UsuarioWeb, eMail';
    if (hasEmailRecuperacion) selectFields += ', eMailRecuperacion';
    if (has2FA) selectFields += ', Autenticacion2FA';

    const result = await pool.request()
      .input('usuarioId', sql.Int, parseInt(usuarioId))
      .query(`
        SELECT ${selectFields}
        FROM WebUsuario
        WHERE UsuarioWeb = @usuarioId AND Estatus = 'ACTIVO'
      `);

    if (result.recordset.length === 0) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const user = result.recordset[0];

    return {
      success: true,
      data: {
        email: user.eMail,
        emailRecuperacion: hasEmailRecuperacion ? (user.eMailRecuperacion || user.eMail) : user.eMail,
        tiene2FA: has2FA ? (user.Autenticacion2FA === true || user.Autenticacion2FA === 1) : false,
      }
    };
  } catch (error: any) {
    console.error('Error obteniendo datos de seguridad:', error);
    return { success: false, error: error.message };
  }
}
