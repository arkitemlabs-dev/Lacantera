/**
 * Script para explorar tablas de usuarios
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

async function exploreUserTables() {
  console.log('🔍 EXPLORANDO TABLAS DE USUARIOS\n');

  try {
    const pool = await sql.connect(config);

    // Buscar tablas con "usuario" o "user"
    const userTables = await pool.request().query(`
      SELECT
        t.name AS TableName,
        (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS ColumnCount
      FROM sys.tables t
      WHERE t.name LIKE '%usuario%' OR t.name LIKE '%user%'
      ORDER BY t.name
    `);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📋 TABLAS ENCONTRADAS: ${userTables.recordset.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const table of userTables.recordset) {
      console.log(`\n📊 TABLA: ${table.TableName} (${table.ColumnCount} columnas)`);
      console.log('─'.repeat(70));

      // Obtener columnas de esta tabla
      const columns = await pool.request()
        .input('tableName', sql.NVarChar, table.TableName)
        .query(`
          SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);

      columns.recordset.forEach(col => {
        let type = col.DATA_TYPE;
        if (col.CHARACTER_MAXIMUM_LENGTH) {
          type += `(${col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH})`;
        }
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';

        console.log(`   ${col.COLUMN_NAME.padEnd(35, ' ')} ${type.padEnd(20, ' ')} ${nullable.padEnd(10, ' ')} ${def}`);
      });
    }

    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 ANÁLISIS DE TABLAS PRINCIPALES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Analizar tabla Usuario si existe
    const usuarioTable = userTables.recordset.find(t => t.TableName === 'Usuario');
    if (usuarioTable) {
      console.log('✅ TABLA PRINCIPAL ENCONTRADA: Usuario\n');

      // Obtener datos de muestra
      const sample = await pool.request().query(`
        SELECT TOP 5 * FROM Usuario
      `);

      console.log(`📌 Registros en la tabla: ${sample.recordset.length > 0 ? 'Tiene datos' : 'Vacía'}\n`);

      if (sample.recordset.length > 0) {
        console.log('Columnas con datos:');
        const firstRow = sample.recordset[0];
        Object.keys(firstRow).forEach(key => {
          const value = firstRow[key];
          const type = typeof value;
          console.log(`   ${key.padEnd(30, ' ')} = ${value !== null ? String(value).substring(0, 50) : 'NULL'}`);
        });
      }
    }

    // Buscar tabla Prov (proveedores)
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLA PROV (PROVEEDORES) - Análisis para Usuarios');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const provColumns = await pool.request().query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prov'
      AND (
        COLUMN_NAME LIKE '%email%' OR
        COLUMN_NAME LIKE '%correo%' OR
        COLUMN_NAME LIKE '%password%' OR
        COLUMN_NAME LIKE '%clave%' OR
        COLUMN_NAME LIKE '%RFC%' OR
        COLUMN_NAME LIKE '%razon%' OR
        COLUMN_NAME LIKE '%nombre%' OR
        COLUMN_NAME LIKE '%status%' OR
        COLUMN_NAME LIKE '%activo%' OR
        COLUMN_NAME LIKE '%ID%'
      )
      ORDER BY ORDINAL_POSITION
    `);

    if (provColumns.recordset.length > 0) {
      console.log('Columnas relevantes en tabla Prov:\n');
      provColumns.recordset.forEach(col => {
        let type = col.DATA_TYPE;
        if (col.CHARACTER_MAXIMUM_LENGTH) {
          type += `(${col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH})`;
        }
        console.log(`   ${col.COLUMN_NAME.padEnd(30, ' ')} ${type.padEnd(20, ' ')} ${col.IS_NULLABLE}`);
      });

      // Obtener muestra de Prov
      const provSample = await pool.request().query(`SELECT TOP 1 * FROM Prov`);

      if (provSample.recordset.length > 0) {
        console.log('\n\n📋 ESTRUCTURA DE UN PROVEEDOR (ejemplo):');
        console.log('─'.repeat(70));
        const prov = provSample.recordset[0];

        // Mostrar solo campos relevantes
        const relevantFields = [
          'Proveedor', 'ProveedorID', 'RFC', 'Nombre', 'RazonSocial',
          'EMail', 'EMailWeb', 'Estatus', 'Activo', 'Situacion'
        ];

        relevantFields.forEach(field => {
          if (prov[field] !== undefined) {
            console.log(`   ${field.padEnd(25, ' ')} = ${prov[field]}`);
          }
        });
      }
    }

    await pool.close();

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

exploreUserTables();
