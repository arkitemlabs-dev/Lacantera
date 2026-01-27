
// @ts-ignore
require('dotenv').config({ path: '.env.local' });
const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function checkSPContent() {
    try {
        const conn = await getERPConnection('la-cantera');
        const result = await conn.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('spDatosProveedor')) as definition
    `);

        console.log('SP Definition:');
        console.log(result.recordset[0].definition);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSPContent();
