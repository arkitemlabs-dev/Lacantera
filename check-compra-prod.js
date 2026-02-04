
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkCompraTable() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera', // Producción
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true'
        }
    };

    try {
        const pool = await sql.connect(config);

        console.log('--- BUSCANDO COLUMNAS EN TABLA Compra ---');
        const columns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Compra' AND COLUMN_NAME IN ('ID', 'MovID', 'Mov')
        `);
        console.table(columns.recordset);

        console.log('--- MUESTRA DE DATOS ---');
        const sample = await pool.request().query('SELECT TOP 5 ID, Mov, MovID FROM Compra WHERE Estatus = \'PENDIENTE\' ORDER BY ID DESC');
        console.table(sample.recordset);

        await pool.close();
        process.exit(0);
    } catch (error) {
        console.log('ERROR:', error.message);
        process.exit(1);
    }
}

checkCompraTable();
