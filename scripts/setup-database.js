/**
 * Script para crear todas las tablas en SQL Server
 * Ejecutar con: node scripts/setup-database.js
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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

async function setupDatabase() {
  let pool;

  try {
    console.log('🔌 Conectando a SQL Server...');
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log('');

    pool = await sql.connect(config);
    console.log('✅ Conexión exitosa\n');

    // Leer el script SQL
    const sqlFilePath = path.join(__dirname, '..', 'database', 'setup-app-tables.sql');
    console.log('📄 Leyendo script SQL...');
    console.log(`   Archivo: ${sqlFilePath}\n`);

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir el script en comandos individuales (separados por GO)
    const commands = sqlScript
      .split(/\nGO\n/gi)
      .filter(cmd => cmd.trim().length > 0);

    console.log(`📋 Se ejecutarán ${commands.length} comandos SQL\n`);
    console.log('⏳ Ejecutando script...\n');

    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();
      if (command) {
        try {
          const result = await pool.request().query(command);

          // Si hay mensajes de PRINT, mostrarlos
          if (result.output) {
            console.log(result.output);
          }
        } catch (err) {
          // Algunos errores son esperados (como "tabla ya existe")
          if (err.message.includes('already exists') || err.message.includes('ya existe')) {
            console.log(`⚠️  ${err.message}`);
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ Script SQL ejecutado exitosamente\n');

    // Verificar las tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN (
        'users', 'empresas', 'usuarios_empresas',
        'proveedores_documentacion', 'ordenes_compra', 'facturas',
        'complementos_pago', 'comprobantes_pago',
        'conversaciones', 'mensajes', 'notificaciones',
        'sessions', 'verification_tokens', 'password_reset_tokens'
      )
      ORDER BY TABLE_NAME
    `);

    console.log('📊 Tablas encontradas:');
    tablesResult.recordset.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.TABLE_NAME}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ BASE DE DATOS CONFIGURADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Próximos pasos:');
    console.log('  1. Ejecutar: npm run dev');
    console.log('  2. Probar el login en http://localhost:3000');
    console.log('  3. Revisar MIGRACION-SQL-SERVER.md para más detalles');
    console.log('');

  } catch (err) {
    console.error('');
    console.error('❌ ERROR:', err.message);
    console.error('');

    if (err.code === 'ELOGIN') {
      console.error('💡 Posibles soluciones:');
      console.error('   - Verificar las credenciales en .env.local');
      console.error('   - Verificar que el usuario tenga permisos');
      console.error('   - Verificar la autenticación SQL Server');
    } else if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET') {
      console.error('💡 Posibles soluciones:');
      console.error('   - Verificar que SQL Server esté corriendo');
      console.error('   - Verificar la dirección del servidor: ' + config.server);
      console.error('   - Verificar el firewall');
      console.error('   - Verificar que SQL Server acepte conexiones remotas');
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
setupDatabase()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
