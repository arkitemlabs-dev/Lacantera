
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function findOrder() {
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

        // Find a recent Purchase Order (Mov = 'Orden Compra' or likely in Intelisis)
        // Intelisis uses 'Mov' to distinguish types in 'Compra' table.
        // We want one that likely allows generating a remission.
        const result = await pool.request().query(`
            SELECT TOP 5 ID, Mov, MovID, Estatus, Proveedor, Empresa
            FROM Compra
            WHERE Estatus = 'PENDIENTE' OR Estatus = 'CONCLUIDO'
            ORDER BY FechaEmision DESC
        `);

        console.table(result.recordset);

    } catch (error) {
        console.error(error);
    } finally {
        await sql.close();
    }
}

findOrder();
