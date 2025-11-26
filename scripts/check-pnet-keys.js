const sql = require('mssql');

const config = {
  server: 'cloud.arkitem.com',
  database: 'PP',
  user: 'sa_ediaz',
  password: 'YX!Au4DJ{Yuz',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkKeys() {
  const pool = await sql.connect(config);

  // Check primary key
  const pk = await pool.request().query(`
    SELECT
      c.name AS ColumnName,
      i.is_primary_key
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('pNetUsuario')
      AND i.is_primary_key = 1
  `);

  console.log('Primary Key en pNetUsuario:', pk.recordset);

  // Check if IDUsuario has IDENTITY
  const identity = await pool.request().query(`
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMNPROPERTY(OBJECT_ID('pNetUsuario'), COLUMN_NAME, 'IsIdentity') AS IsIdentity
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pNetUsuario'
      AND COLUMN_NAME = 'IDUsuario'
  `);

  console.log('\nIDUsuario details:', identity.recordset);

  await pool.close();
}

checkKeys();
