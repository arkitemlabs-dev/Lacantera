// Test directo de autenticación
const sql = require('mssql');
const bcrypt = require('bcrypt');

const sqlConfig = {
  user: 'sa_ediaz',
  password: 'YX!Au4DJ{Yuz',
  server: 'cloud.arkitem.com',
  database: 'PP',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function testAuth() {
  console.log('='.repeat(80));
  console.log('TEST DE AUTENTICACIÓN DIRECTA');
  console.log('='.repeat(80));
  console.log('');

  const email = 'admin@lacantera.com';
  const password = 'admin123456';

  try {
    console.log('[1] Conectando a SQL Server...');
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Conexión exitosa\n');

    console.log('[2] Buscando usuario en WebUsuario...');
    const result = await pool
      .request()
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

    console.log(`   Registros encontrados: ${result.recordset.length}`);

    if (result.recordset.length === 0) {
      console.log('❌ Usuario NO encontrado\n');
      await pool.close();
      return;
    }

    const user = result.recordset[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   - UsuarioWeb: ${user.UsuarioWeb}`);
    console.log(`   - Nombre: ${user.Nombre}`);
    console.log(`   - Email: ${user.eMail}`);
    console.log(`   - Rol: ${user.Rol}`);
    console.log(`   - Estatus: ${user.Estatus}`);
    console.log(`   - Hash (primeros 20 chars): ${user.Contrasena.substring(0, 20)}...`);
    console.log('');

    console.log('[3] Verificando contraseña con bcrypt...');
    console.log(`   Password ingresado: ${password}`);
    console.log(`   Hash en BD: ${user.Contrasena}`);
    console.log('');

    const isValid = await bcrypt.compare(password, user.Contrasena);

    if (isValid) {
      console.log('✅ CONTRASEÑA VÁLIDA - LOGIN EXITOSO');
      console.log('');
      console.log('Datos de usuario autenticado:');
      console.log(`   ID: ${user.UsuarioWeb}`);
      console.log(`   Email: ${user.eMail}`);
      console.log(`   Name: ${user.Nombre}`);
      console.log(`   Role: ${user.Rol}`);
      console.log(`   UserType: ${user.Rol === 'super-admin' || user.Rol === 'admin' ? 'Administrador' : 'Usuario'}`);
    } else {
      console.log('❌ CONTRASEÑA INVÁLIDA - LOGIN FALLIDO');
      console.log('');
      console.log('POSIBLES CAUSAS:');
      console.log('1. El hash en la BD no corresponde a "admin123456"');
      console.log('2. Hay un problema con la versión de bcrypt');
      console.log('3. El hash fue generado con otro algoritmo');
    }

    console.log('');
    await pool.close();
    console.log('='.repeat(80));
    console.log('TEST COMPLETADO');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ ERROR:');
    console.error(error);
    console.error('');
  }
}

testAuth();
