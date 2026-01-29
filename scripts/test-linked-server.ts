
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: '.env.local' });

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

async function testLinkedServer() {
    console.log(`Connecting to ${config.server} (PP) to test Linked Server to 104.46.127.151...`);
    try {
        const pool = await sql.connect(config);

        console.log('\n--- Testing Linked Server Query ---');
        // Intentar consultar la tabla Prov a través del linked server
        const query = "SELECT TOP 5 Proveedor, Nombre FROM [104.46.127.151].Cantera.dbo.Prov";
        console.log(`Executing: ${query}`);

        const result = await pool.request().query(query);
        console.log('✅ Linked Server query SUCCESSFUL!');
        console.table(result.recordset);

        await pool.close();
    } catch (error) {
        console.error('❌ Linked Server query FAILED:', error.message);

        // Intentar con Cantera_ajustes por si acaso
        try {
            console.log('\n--- Retrying with Cantera_ajustes ---');
            const pool = await sql.connect(config);
            const query = "SELECT TOP 5 Proveedor, Nombre FROM [104.46.127.151].Cantera_ajustes.dbo.Prov";
            const result = await pool.request().query(query);
            console.log('✅ Linked Server query (Cantera_ajustes) SUCCESSFUL!');
            console.table(result.recordset);
            await pool.close();
        } catch (err) {
            console.error('❌ Retry FAILED:', err.message);
        }
    } finally {
        process.exit(0);
    }
}

testLinkedServer();
