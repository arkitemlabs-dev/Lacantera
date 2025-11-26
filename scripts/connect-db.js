/**
 * Script directo para conectarse y ver las tablas
 */

const sql = require('mssql');

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

async function conectar() {
  console.log('🔌 Conectando a SQL Server...');
  console.log(`   Server: ${config.server}`);
  console.log(`   Database: ${config.database}`);
  console.log('');

  try {
    const pool = await sql.connect(config);
    console.log('✅ Conexión exitosa!\n');

    // Obtener tablas
    console.log('📋 TABLAS EN LA BASE DE DATOS PP:');
    console.log('═'.repeat(70));
    console.log('');

    const result = await pool.request().query(`
      SELECT
        s.name AS [Schema],
        t.name AS Tabla,
        (SELECT COUNT(*)
         FROM sys.columns c
         WHERE c.object_id = t.object_id) AS Columnas
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      ORDER BY s.name, t.name
    `);

    console.log(`Total de tablas: ${result.recordset.length}\n`);

    const bySchema = {};
    result.recordset.forEach(row => {
      if (!bySchema[row.Schema]) {
        bySchema[row.Schema] = [];
      }
      bySchema[row.Schema].push(row);
    });

    Object.keys(bySchema).sort().forEach(schema => {
      console.log(`\n📁 Schema: ${schema}`);
      console.log('─'.repeat(70));
      bySchema[schema].forEach((table, idx) => {
        console.log(`   ${(idx + 1).toString().padStart(3, ' ')}. ${table.Tabla.padEnd(40, ' ')} (${table.Columnas} columnas)`);
      });
    });

    console.log('\n');
    await pool.close();

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    process.exit(1);
  }
}

conectar();
