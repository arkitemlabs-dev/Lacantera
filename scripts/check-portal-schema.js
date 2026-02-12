
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const portalConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkSchema() {
    try {
        const pool = await sql.connect(portalConfig);
        
        console.log('--- Columnas de WebUsuario ---');
        const webCols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'WebUsuario'");
        console.log(JSON.stringify(webCols.recordset, null, 2));

        console.log('\n--- Columnas de pNetUsuario ---');
        const pNetCols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pNetUsuario'");
        console.log(JSON.stringify(pNetCols.recordset, null, 2));

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

checkSchema();
