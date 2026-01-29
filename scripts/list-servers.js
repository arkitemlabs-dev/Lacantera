
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

async function listServers() {
    try {
        await sql.connect(config);
        const result = await sql.query("SELECT name, product, provider, data_source FROM sys.servers");
        console.table(result.recordset);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

listServers();
