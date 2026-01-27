
// @ts-ignore
require('dotenv').config({ path: '.env.local' });
const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function testSQL() {
    try {
        const conn = await getERPConnection('la-cantera');
        const result = await conn.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'M')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), 'P00443')
            .input('Nombre', sql.VarChar(100), 'ARQUITECTURA Y CONSULTO RIA EMPRESARIAL SA DE CV')
            .execute('spDatosProveedor');

        console.log('Success:', result.recordset);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSQL();
