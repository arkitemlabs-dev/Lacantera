
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: '.env.local' });

const config = {
    server: process.env.MSSQL_SERVER,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    }
};

async function testCanteraOnPortalServer() {
    console.log(`Connecting to ${config.server} to check for 'Cantera' database...`);
    try {
        const pool = await sql.connect(config);

        console.log('\n--- Listing Databases ---');
        const result = await pool.request().query("SELECT name FROM sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')");
        console.log('Available databases:', result.recordset.map(r => r.name).join(', '));

        const hasCantera = result.recordset.some(r => r.name.toLowerCase() === 'cantera');
        if (hasCantera) {
            console.log("✅ 'Cantera' database FOUND on portal server.");

            console.log("\n--- Testing Connection to 'Cantera' ---");
            await pool.close();
            const canteraConfig = { ...config, database: 'Cantera' };
            const canteraPool = await sql.connect(canteraConfig);
            const dbCheck = await canteraPool.request().query('SELECT DB_NAME() as dbName');
            console.log(`✅ Successfully connected to: ${dbCheck.recordset[0].dbName}`);
            await canteraPool.close();
        } else {
            console.log("❌ 'Cantera' database NOT FOUND on portal server.");
        }

    } catch (error) {
        console.error('Error during test:', error.message);
    } finally {
        process.exit(0);
    }
}

testCanteraOnPortalServer();
