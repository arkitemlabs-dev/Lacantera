/**
 * Script para probar la conexión a SQL Server
 *
 * Uso:
 *   node scripts/test-db-connection.js
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const sqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

console.log('🔍 Probando conexión a SQL Server...\n');
console.log('📋 Configuración:');
console.log(`   Server: ${sqlConfig.server}`);
console.log(`   Database: ${sqlConfig.database}`);
console.log(`   User: ${sqlConfig.user}`);
console.log(`   Encrypt: ${sqlConfig.options.encrypt}`);
console.log(`   Trust Certificate: ${sqlConfig.options.trustServerCertificate}`);
console.log('');

async function testConnection() {
  let pool;

  try {
    console.log('⏳ Conectando a SQL Server...');

    pool = await sql.connect(sqlConfig);

    console.log('✅ Conexión exitosa!\n');

    // Probar una consulta simple
    console.log('📊 Probando consulta SQL...');
    const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as database_name');

    console.log('✅ Consulta exitosa!\n');
    console.log('📌 Información del servidor:');
    console.log(`   Versión: ${result.recordset[0].version.split('\n')[0]}`);
    console.log(`   Base de datos actual: ${result.recordset[0].database_name}`);
    console.log('');

    // Verificar tablas existentes
    console.log('🔍 Verificando tablas en la base de datos...');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    if (tables.recordset.length === 0) {
      console.log('⚠️  No se encontraron tablas en la base de datos.');
      console.log('');
      console.log('💡 Ejecuta el script SQL para crear las tablas:');
      console.log('   sqlcmd -S SRVARKITEM02 -U sa -P "YX!Au4DJ{Yuz" -d pp -i database/setup-auth-tables.sql');
    } else {
      console.log(`✅ Se encontraron ${tables.recordset.length} tabla(s):\n`);
      tables.recordset.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.TABLE_NAME}`);
      });
    }

    console.log('');

    // Verificar si existe la tabla users
    const usersTable = tables.recordset.find(t => t.TABLE_NAME === 'users');
    if (usersTable) {
      console.log('✅ Tabla "users" encontrada');

      // Contar usuarios
      const userCount = await pool.request().query('SELECT COUNT(*) as count FROM users');
      console.log(`   Total de usuarios: ${userCount.recordset[0].count}`);
    } else {
      console.log('⚠️  Tabla "users" no encontrada');
      console.log('   Necesitas ejecutar el script de migración: database/setup-auth-tables.sql');
    }

    console.log('\n✅ Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('\n❌ Error de conexión:\n');

    if (error.code === 'ELOGIN') {
      console.error('   Error de autenticación:');
      console.error('   - Verifica el usuario y contraseña en .env.local');
      console.error('   - El usuario debe tener permisos en la base de datos');
    } else if (error.code === 'ESOCKET') {
      console.error('   Error de conexión al servidor:');
      console.error('   - Verifica que SQL Server esté corriendo');
      console.error('   - Verifica el nombre del servidor: ' + sqlConfig.server);
      console.error('   - Verifica que el puerto 1433 esté abierto');
      console.error('   - Verifica la configuración de firewall');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Servidor no encontrado:');
      console.error('   - Verifica el nombre del servidor en .env.local');
      console.error('   - Asegúrate de que el servidor esté accesible desde tu red');
    } else if (error.originalError && error.originalError.message) {
      console.error('   ' + error.originalError.message);
    } else {
      console.error('   ' + error.message);
    }

    console.error('\n📋 Detalles del error:');
    console.error(error);

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexión cerrada.');
    }
  }
}

testConnection();
