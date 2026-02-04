
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkProdParams() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera', // Producción real
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true'
        }
    };

    try {
        console.log('--- CONECTANDO A BASE DE DATOS DE PRODUCCIÓN: Cantera ---');
        const pool = await sql.connect(config);

        console.log('--- CONSULTANDO PARÁMETROS DE spGeneraRemisionCompra ---');
        const result = await pool.request().query(`
            SELECT 
                PARAMETER_NAME, 
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                PARAMETER_MODE,
                ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.PARAMETERS 
            WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
            ORDER BY ORDINAL_POSITION
        `);

        if (result.recordset.length === 0) {
            console.log('⚠️ El SP spGeneraRemisionCompra NO EXISTE en la base de datos Cantera');
        } else {
            console.table(result.recordset);
        }

        await pool.close();
        process.exit(0);
    } catch (error) {
        console.log('❌ ERROR FATAL:', error.message);
        process.exit(1);
    }
}

checkProdParams();
