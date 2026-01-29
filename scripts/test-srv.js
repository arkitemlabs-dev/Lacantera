
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
    server: 'cloud.arkitem.com',
    user: 'sa_ediaz',
    password: 'ediaz123456789?',
    database: 'PP',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

async function testSRV() {
    try {
        await sql.connect(config);
        console.log('Connected to Portal');

        // Intentar listar bases de datos en el servidor vinculado
        console.log('Listing databases on SRVARKITEM02...');
        const result = await sql.query("SELECT name FROM SRVARKITEM02.master.sys.databases");
        console.table(result.recordset);

    } catch (err) {
        console.error('Error:', err.message);

        // Si falla con master, intentar consultar Prov directamente en Cantera
        try {
            console.log('Trying direct query on Cantera...');
            const result = await sql.query("SELECT TOP 1 Proveedor, Nombre FROM SRVARKITEM02.Cantera.dbo.Prov");
            console.log('Success:', result.recordset);
        } catch (err2) {
            console.error('Direct query failed:', err2.message);
        }
    } finally {
        process.exit(0);
    }
}

testSRV();
