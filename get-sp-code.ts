
// @ts-ignore
require('dotenv').config({ path: '.env.local' });
const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function getSPCode() {
    try {
        const conn = await getERPConnection('la-cantera');
        const result = await conn.request().query(`
      SELECT m.definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON m.object_id = o.object_id
      WHERE o.name = 'spDatosProveedor'
    `);

        if (result.recordset.length > 0) {
            console.log(result.recordset[0].definition);
        } else {
            console.log('SP not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

getSPCode();
