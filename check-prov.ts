
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { getERPConnection } = require('./src/lib/database/multi-tenant-connection');
const sql = require('mssql');

async function checkProvider() {
    try {
        console.log('MSSQL_ERP_SERVER:', process.env.MSSQL_ERP_SERVER);

        // Probar con Cantera (ajustes/test) que es empresa '06'
        // En tenant-configs.ts (TEST), 'la-cantera' mapea a ERP 06
        const conn = await getERPConnection('la-cantera');

        // Consultar proveedores con el nuevo SP
        const result = await conn.request()
            .input('Empresa', sql.VarChar, '06')
            .input('Operacion', sql.VarChar, 'C')
            .execute('spDatosProveedor');

        console.log('Result length:', result.recordset?.length);
        if (result.recordset && result.recordset.length > 0) {
            console.log('Sample Data (First 1):', JSON.stringify(result.recordset[0], null, 2));
        }

        await conn.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProvider();
