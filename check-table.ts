
// @ts-ignore
require('dotenv').config({ path: '.env.local' });
const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function checkTable() {
    try {
        const conn = await getERPConnection('la-cantera');
        const result = await conn.request().query(`
      SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prov'
      ORDER BY COLUMN_NAME
    `);

        console.log('Table Prov structure:');
        console.table(result.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTable();
