/**
 * Script para listar todas las tablas existentes en la base de datos SQL Server
 * Ejecutar con: node scripts/list-existing-tables.js
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
};

async function listTables() {
  let pool;

  try {
    console.log('🔌 Conectando a SQL Server...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log('');

    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');

    // Obtener todas las tablas
    console.log('📋 Listando todas las tablas en la base de datos...\n');

    const result = await pool.request().query(`
      SELECT
        t.TABLE_SCHEMA as [Schema],
        t.TABLE_NAME as [Table],
        (SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS c
         WHERE c.TABLE_NAME = t.TABLE_NAME
         AND c.TABLE_SCHEMA = t.TABLE_SCHEMA) as [Columns]
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_SCHEMA, t.TABLE_NAME
    `);

    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total de tablas encontradas: ${result.recordset.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Agrupar por schema
    const schemas = {};
    result.recordset.forEach(row => {
      if (!schemas[row.Schema]) {
        schemas[row.Schema] = [];
      }
      schemas[row.Schema].push(row);
    });

    // Mostrar por schema
    Object.keys(schemas).sort().forEach(schema => {
      console.log(`\n📁 Schema: ${schema}`);
      console.log('─'.repeat(60));

      schemas[schema].forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.Table} (${table.Columns} columnas)`);
      });
    });

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ LISTADO COMPLETO');
    console.log('═══════════════════════════════════════════════════════\n');

    // Preguntar si quiere ver detalles de alguna tabla
    console.log('💡 Para ver detalles de una tabla específica, ejecuta:');
    console.log('   node scripts/describe-table.js <nombre_tabla>');
    console.log('');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('');

    if (err.code === 'ELOGIN') {
      console.error('💡 Posibles soluciones:');
      console.error('   - Verificar las credenciales en .env.local');
      console.error('   - Verificar que el usuario tenga permisos');
    } else if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET') {
      console.error('💡 Posibles soluciones:');
      console.error('   - Verificar que SQL Server esté corriendo');
      console.error('   - Verificar la dirección del servidor');
      console.error('   - Verificar el firewall');
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Ejecutar
listTables()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
