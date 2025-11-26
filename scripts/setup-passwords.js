/**
 * Script para crear tabla de passwords y agregar contraseñas de prueba
 */

const sql = require('mssql');
const bcrypt = require('bcrypt');

const config = {
  server: 'cloud.arkitem.com',
  database: 'PP',
  user: 'sa_ediaz',
  password: 'YX!Au4DJ{Yuz',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
  },
};

async function setupPasswords() {
  console.log('🔐 CONFIGURANDO SISTEMA DE CONTRASEÑAS\n');

  let pool;

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // ========================================
    // 1. CREAR TABLA
    // ========================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('1️⃣  CREANDO TABLA pNetUsuarioPassword');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const tableExists = await pool.request().query(`
      SELECT * FROM sys.tables WHERE name = 'pNetUsuarioPassword'
    `);

    if (tableExists.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE pNetUsuarioPassword (
          IDUsuario       INT NOT NULL,
          PasswordHash    VARCHAR(255) NOT NULL,
          CreatedAt       DATETIME2 NOT NULL DEFAULT GETDATE(),
          UpdatedAt       DATETIME2 NULL,

          CONSTRAINT PK_pNetUsuarioPassword PRIMARY KEY (IDUsuario)
        )
      `);

      await pool.request().query(`
        CREATE UNIQUE INDEX idx_pNetUsuarioPassword_IDUsuario ON pNetUsuarioPassword(IDUsuario)
      `);

      console.log('✅ Tabla pNetUsuarioPassword creada exitosamente\n');
      console.log('ℹ️  Nota: No se creó FK debido a que pNetUsuario usa composite key\n');
    } else {
      console.log('⚠️  Tabla pNetUsuarioPassword ya existe\n');
    }

    // ========================================
    // 2. AGREGAR CONTRASEÑAS
    // ========================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('2️⃣  AGREGANDO CONTRASEÑAS DE PRUEBA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const usuarios = [
      { email: 'proveedor@test.com', password: 'Test123!' },
      { email: 'admin@lacantera.com', password: 'Admin123!' }
    ];

    for (const user of usuarios) {
      // Buscar usuario
      const userRecord = await pool.request()
        .input('email', sql.VarChar(50), user.email)
        .query('SELECT IDUsuario, Usuario, Nombre FROM pNetUsuario WHERE eMail = @email');

      if (userRecord.recordset.length > 0) {
        const userId = userRecord.recordset[0].IDUsuario;
        const userName = userRecord.recordset[0].Nombre;

        // Generar hash
        const hash = await bcrypt.hash(user.password, 10);

        // Verificar si ya tiene password
        const existsPassword = await pool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT IDUsuario FROM pNetUsuarioPassword WHERE IDUsuario = @userId');

        if (existsPassword.recordset.length === 0) {
          // Insertar password
          await pool.request()
            .input('userId', sql.Int, userId)
            .input('hash', sql.VarChar(255), hash)
            .query(`
              INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)
              VALUES (@userId, @hash)
            `);

          console.log(`✅ Password creado para: ${user.email}`);
          console.log(`   ID Usuario: ${userId}`);
          console.log(`   Nombre: ${userName}`);
          console.log(`   Password: ${user.password}`);
          console.log('');
        } else {
          // Actualizar password
          await pool.request()
            .input('userId', sql.Int, userId)
            .input('hash', sql.VarChar(255), hash)
            .query(`
              UPDATE pNetUsuarioPassword
              SET PasswordHash = @hash, UpdatedAt = GETDATE()
              WHERE IDUsuario = @userId
            `);

          console.log(`🔄 Password actualizado para: ${user.email}`);
          console.log(`   ID Usuario: ${userId}`);
          console.log(`   Password: ${user.password}`);
          console.log('');
        }
      } else {
        console.log(`❌ Usuario no encontrado: ${user.email}\n`);
      }
    }

    // ========================================
    // 3. VERIFICAR
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('3️⃣  VERIFICACIÓN DE USUARIOS CON PASSWORD');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const verification = await pool.request().query(`
      SELECT
        u.IDUsuario,
        u.eMail,
        u.Nombre,
        t.Descripcion as TipoUsuario,
        CASE WHEN p.IDUsuario IS NOT NULL THEN 'SI' ELSE 'NO' END as TienePassword
      FROM pNetUsuario u
      INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
      LEFT JOIN pNetUsuarioPassword p ON u.IDUsuario = p.IDUsuario
      WHERE u.Estatus = 'ACTIVO' OR u.Estatus = '1'
      ORDER BY u.IDUsuario
    `);

    console.log('Usuarios activos:\n');
    verification.recordset.forEach((user, idx) => {
      const pwIcon = user.TienePassword === 'SI' ? '🔐' : '❌';
      console.log(`${idx + 1}. ${pwIcon} ${user.eMail.padEnd(30, ' ')} | ${user.TipoUsuario.padEnd(15, ' ')} | PW: ${user.TienePassword}`);
    });

    // ========================================
    // 4. CREDENCIALES FINALES
    // ========================================
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('🔑 CREDENCIALES DE ACCESO AL PORTAL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('PROVEEDOR:');
    console.log('   Email:    proveedor@test.com');
    console.log('   Password: Test123!\n');

    console.log('ADMINISTRADOR:');
    console.log('   Email:    admin@lacantera.com');
    console.log('   Password: Admin123!\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ SISTEMA DE CONTRASEÑAS CONFIGURADO');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.close();

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    console.error('\n   Stack:', err.stack);
    process.exit(1);
  }
}

// Ejecutar
setupPasswords()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
