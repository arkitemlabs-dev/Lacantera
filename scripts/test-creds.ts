
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: '.env.local' });

const configs = [
    {
        name: 'Config from .env.local',
        server: 'cloud.arkitem.com',
        user: 'sa_ediaz',
        password: 'ediaz123456789?',
        options: { encrypt: false, trustServerCertificate: true }
    },
    {
        name: 'Config from connect-db.js',
        server: 'cloud.arkitem.com',
        user: 'sa_ediaz',
        password: 'YX!Au4DJ{Yuz',
        options: { encrypt: false, trustServerCertificate: true }
    }
];

async function testMultipleConfigs() {
    for (const config of configs) {
        console.log(`\n--- Testing ${config.name} ---`);
        try {
            const pool = await sql.connect(config);
            console.log('✅ Connection successful');

            const dbResult = await pool.request().query("SELECT name FROM sys.databases");
            const dbNames = dbResult.recordset.map(r => r.name);
            console.log('Databases available:', dbNames.join(', '));

            if (dbNames.some(name => name.toLowerCase().includes('cantera'))) {
                console.log('🎉 FOUND CANTERA!');
            }

            await pool.close();
        } catch (error) {
            console.error(`❌ Connection failed: ${error.message}`);
        }
    }
    process.exit(0);
}

testMultipleConfigs();
