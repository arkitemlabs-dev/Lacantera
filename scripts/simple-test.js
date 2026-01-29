
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

async function test() {
    try {
        await sql.connect(config);
        console.log('Connected to Portal');
        const result = await sql.query("SELECT TOP 1 Proveedor, Nombre FROM [104.46.127.151].Cantera.dbo.Prov");
        console.log('QueryResult:', result.recordset);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

test();
