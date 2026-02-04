
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkAll() {
    const dbs = ['GALBD', 'GALBD_PRUEBAS'];
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        const pool = await sql.connect(config);
        for (const db of dbs) {
            console.log(`--- DB: ${db} ---`);
            try {
                const result = await pool.request().query(`
                    SELECT PARAMETER_NAME, DATA_TYPE 
                    FROM ${db}.INFORMATION_SCHEMA.PARAMETERS 
                    WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
                `);
                console.table(result.recordset);
            } catch (e) {
                console.log(`Error in ${db}: ${e.message}`);
            }
        }
        await pool.close();
    } catch (error) {
        console.error('Connection Error:', error);
    }
}

checkAll();
