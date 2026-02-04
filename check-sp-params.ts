
// @ts-ignore
require('dotenv').config({ path: '.env.local' });
const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function checkParams() {
    try {
        const conn = await getERPConnection('la-cantera-test');
        const result = await conn.request().query(`
      SELECT 
          PARAMETER_NAME, 
          DATA_TYPE, 
          CHARACTER_MAXIMUM_LENGTH,
          ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('SP Parameters for spGeneraRemisionCompra:');
        console.table(result.recordset);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkParams();
