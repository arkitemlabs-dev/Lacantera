/**
 * Script para encontrar tablas relevantes para el sistema de proveedores
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

async function findRelevantTables() {
  console.log('🔍 BUSCANDO TABLAS RELEVANTES PARA SISTEMA DE PROVEEDORES\n');

  try {
    const pool = await sql.connect(config);

    // Buscar tablas relacionadas con proveedores, facturas, órdenes, etc.
    const keywords = [
      { keyword: 'Prov', desc: 'Proveedores' },
      { keyword: 'Supplier', desc: 'Proveedores (inglés)' },
      { keyword: 'Vendor', desc: 'Proveedores (vendor)' },
      { keyword: 'Compra', desc: 'Compras' },
      { keyword: 'Purchase', desc: 'Compras (inglés)' },
      { keyword: 'Orden', desc: 'Órdenes' },
      { keyword: 'Order', desc: 'Órdenes (inglés)' },
      { keyword: 'OC', desc: 'Órdenes de Compra' },
      { keyword: 'Factura', desc: 'Facturas' },
      { keyword: 'Invoice', desc: 'Facturas (inglés)' },
      { keyword: 'CFDI', desc: 'Comprobantes Fiscales' },
      { keyword: 'Pago', desc: 'Pagos' },
      { keyword: 'Payment', desc: 'Pagos (inglés)' },
      { keyword: 'Documento', desc: 'Documentos' },
      { keyword: 'Document', desc: 'Documentos (inglés)' },
      { keyword: 'Usuario', desc: 'Usuarios' },
      { keyword: 'User', desc: 'Usuarios (inglés)' },
      { keyword: 'Empresa', desc: 'Empresas' },
      { keyword: 'Company', desc: 'Empresas (inglés)' },
    ];

    // Obtener todas las tablas
    const allTables = await pool.request().query(`
      SELECT
        s.name AS [Schema],
        t.name AS TableName,
        (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = t.object_id) AS ColumnCount
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      ORDER BY t.name
    `);

    for (const { keyword, desc } of keywords) {
      const tables = allTables.recordset.filter(t =>
        t.TableName.toLowerCase().includes(keyword.toLowerCase())
      );

      if (tables.length > 0) {
        console.log(`\n📋 ${desc} (${keyword}):`);
        console.log('─'.repeat(70));
        tables.forEach(table => {
          console.log(`   ${table.Schema}.${table.TableName.padEnd(40, ' ')} (${table.ColumnCount} cols)`);
        });
      }
    }

    console.log('\n');
    console.log('═'.repeat(70));
    console.log('💡 RECOMENDACIONES PARA EXPLORAR');
    console.log('═'.repeat(70));

    // Sugerir tablas principales basadas en nombres comunes
    const suggestions = [
      'Prov',
      'ProvCto',
      'Compra',
      'Orden',
      'Factura',
      'CFDI',
      'Usuario',
      'Empresa',
    ];

    for (const suggestion of suggestions) {
      const found = allTables.recordset.find(t =>
        t.TableName.toLowerCase() === suggestion.toLowerCase()
      );

      if (found) {
        console.log(`\n✅ Tabla encontrada: ${found.TableName}`);

        // Obtener columnas de esta tabla
        const columns = await pool.request()
          .input('tableName', sql.NVarChar, found.TableName)
          .query(`
            SELECT
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
          `);

        console.log(`   Columnas (${columns.recordset.length}):`);
        columns.recordset.slice(0, 10).forEach(col => {
          const type = col.CHARACTER_MAXIMUM_LENGTH
            ? `${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH})`
            : col.DATA_TYPE;
          const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          console.log(`      - ${col.COLUMN_NAME.padEnd(30, ' ')} ${type.padEnd(20, ' ')} ${nullable}`);
        });

        if (columns.recordset.length > 10) {
          console.log(`      ... y ${columns.recordset.length - 10} columnas más`);
        }
      }
    }

    console.log('\n');
    await pool.close();

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  }
}

findRelevantTables();
