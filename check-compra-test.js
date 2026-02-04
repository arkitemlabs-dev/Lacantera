
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkCompraTest() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_Ajustes', // Test
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true'
        }
    };

    try {
        const pool = await sql.connect(config);
        const columns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Compra' AND COLUMN_NAME IN ('ID', 'MovID')
        `);
        console.table(columns.recordset);
        await pool.close();
        process.exit(0);
    } catch (error) {
        console.log('ERROR:', error.message);
        process.exit(1);
    }
}

checkCompraTest();
