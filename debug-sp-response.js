
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function debugSP() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_ajustes', // Test DB
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        console.log('Connecting...');
        const pool = await sql.connect(config);

        const request = pool.request();

        // Listen for PRINT messages
        request.on('info', info => {
            console.log('Got INFO message:', info);
        });

        console.log('Executing spGeneraRemisionCompra with: Empresa=01, MovId=COR9917, Factura=F-TEST-DEBUG');

        const result = await request
            .input('Empresa', sql.VarChar(5), '01')
            .input('MovId', sql.VarChar(20), 'COR9917')
            .input('Factura', sql.VarChar(20), 'F-TEST-DEBUG')
            .execute('spGeneraRemisionCompra');

        console.log('--- EXECUTION SUCCESS ---');
        console.log('Recordsets length:', result.recordsets.length);
        if (result.recordsets.length > 0) {
            console.log('First recordset:', result.recordset);
        }
        console.log('Output:', result.output);
        console.log('ReturnValue:', result.returnValue);

    } catch (error) {
        console.log('--- EXECUTION ERROR ---');
        console.error(error);
    } finally {
        await sql.close();
    }
}

debugSP();
