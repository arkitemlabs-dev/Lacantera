/**
 * Script para listar todas las tablas existentes en SQL Server
 * Con configuración más detallada
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function showTables() {
  console.log('🔍 EXPLORADOR DE TABLAS SQL SERVER');
  console.log('═'.repeat(60));
  console.log(`\n📌 Configuración:`);
  console.log(`   Server: ${config.server}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Encrypt: ${config.options.encrypt}`);
  console.log(`   Trust Cert: ${config.options.trustServerCertificate}`);
  console.log('');

  let pool;

  try {
    console.log('⏳ Conectando...');
    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa!\n');

    // 1. Información de la base de datos
    console.log('📊 INFORMACIÓN DE LA BASE DE DATOS');
    console.log('─'.repeat(60));

    const dbInfo = await pool.request().query(`
      SELECT
        DB_NAME() as DatabaseName,
        @@VERSION as SQLServerVersion
    `);

    console.log(`   Base de datos: ${dbInfo.recordset[0].DatabaseName}`);
    console.log(`   Versión: ${dbInfo.recordset[0].SQLServerVersion.split('\n')[0]}`);
    console.log('');

    // 2. Listar todas las tablas con información detallada
    console.log('📋 TABLAS DISPONIBLES');
    console.log('─'.repeat(60));

    const tables = await pool.request().query(`
      SELECT
        s.name AS [Schema],
        t.name AS TableName,
        (SELECT COUNT(*)
         FROM sys.columns c
         WHERE c.object_id = t.object_id) AS ColumnCount,
        (SELECT COUNT(*)
         FROM sys.indexes i
         WHERE i.object_id = t.object_id
         AND i.is_primary_key = 1) AS HasPrimaryKey
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      ORDER BY s.name, t.name
    `);

    if (tables.recordset.length === 0) {
      console.log('   ⚠️  No se encontraron tablas en la base de datos\n');
    } else {
      console.log(`   Total: ${tables.recordset.length} tablas\n`);

      // Agrupar por schema
      const bySchema = {};
      tables.recordset.forEach(table => {
        if (!bySchema[table.Schema]) {
          bySchema[table.Schema] = [];
        }
        bySchema[table.Schema].push(table);
      });

      // Mostrar tablas por schema
      Object.keys(bySchema).sort().forEach(schema => {
        console.log(`\n   📁 ${schema}`);
        bySchema[schema].forEach((table, idx) => {
          const pk = table.HasPrimaryKey ? '🔑' : '  ';
          console.log(`      ${pk} ${idx + 1}. ${table.TableName} (${table.ColumnCount} columnas)`);
        });
      });
    }

    console.log('\n');

    // 3. Buscar tablas específicas que podrían ser útiles
    console.log('🔍 TABLAS RELACIONADAS CON EL SISTEMA');
    console.log('─'.repeat(60));

    const keywords = [
      'user', 'usuario', 'empresa', 'proveedor', 'supplier',
      'factura', 'invoice', 'orden', 'order', 'compra', 'purchase',
      'documento', 'document', 'pago', 'payment', 'cliente', 'customer'
    ];

    const relevantTables = tables.recordset.filter(table =>
      keywords.some(keyword =>
        table.TableName.toLowerCase().includes(keyword)
      )
    );

    if (relevantTables.length > 0) {
      console.log(`   Encontradas ${relevantTables.length} tablas relevantes:\n`);
      relevantTables.forEach((table, idx) => {
        console.log(`   ${idx + 1}. ${table.Schema}.${table.TableName} (${table.ColumnCount} columnas)`);
      });
    } else {
      console.log('   ⚠️  No se encontraron tablas con nombres relacionados\n');
    }

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✅ EXPLORACIÓN COMPLETADA');
    console.log('═'.repeat(60));
    console.log('\n💡 Para ver la estructura de una tabla específica:');
    console.log('   SELECT * FROM INFORMATION_SCHEMA.COLUMNS');
    console.log('   WHERE TABLE_NAME = \'nombre_tabla\'');
    console.log('');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('\nDetalles del error:');
    console.error('   Código:', err.code);
    console.error('   Nombre:', err.name);

    if (err.originalError) {
      console.error('   Error original:', err.originalError.message);
    }

    console.error('\n💡 Soluciones posibles:');

    if (err.code === 'ELOGIN') {
      console.error('   ❌ Error de autenticación');
      console.error('   - Verifica el usuario y contraseña en .env.local');
      console.error('   - Verifica que el usuario tenga permisos en la base de datos');
    } else if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET') {
      console.error('   ❌ Error de conexión');
      console.error('   - Verifica que SQL Server esté corriendo');
      console.error('   - Verifica que el servidor acepte conexiones remotas');
      console.error('   - Verifica el puerto (por defecto 1433)');
      console.error('   - Verifica el firewall');
      console.error('   - Intenta con MSSQL_TRUST_CERT=true en .env.local');
    } else if (err.code === 'EINSTLOOKUP') {
      console.error('   ❌ No se puede encontrar el servidor');
      console.error('   - Verifica la dirección IP o nombre del servidor');
      console.error('   - Intenta con el nombre completo o IP');
    }

    console.error('');
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

showTables().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
