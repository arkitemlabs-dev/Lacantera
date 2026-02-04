
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkParams() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_Ajustes', // CHECKING TEST DB
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true'
        }
    };

    try {
        console.log('Connecting to ERP (TEST DB):', config.server);
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
      SELECT 
          PARAMETER_NAME, 
          DATA_TYPE, 
          CHARACTER_MAXIMUM_LENGTH,
          ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
      ORDER BY ORDINAL_POSITION
    `);

        console.log('SP Parameters for spGeneraRemisionCompra in TEST DB:');
        console.table(result.recordset);

        await pool.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkParams();
