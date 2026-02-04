
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkParams() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_Ajustes',
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true'
        }
    };

    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT PARAMETER_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.PARAMETERS WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'");
        console.log('RESULT:' + JSON.stringify(result.recordset));
        await pool.close();
        process.exit(0);
    } catch (error) {
        console.log('ERROR:' + error.message);
        process.exit(1);
    }
}

checkParams();
