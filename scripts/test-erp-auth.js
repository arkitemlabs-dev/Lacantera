
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
    server: '104.46.127.151',
    user: 'sa_intelisis9',
    password: '}eR88ndWX*Rv',
    database: 'Cantera',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000
    }
};

async function testAuth() {
    console.log(`Connecting to ${config.server} with user ${config.user}...`);
    try {
        await sql.connect(config);
        console.log('✅ Connection successful with Intelisis credentials!');
        await sql.close();
    } catch (err) {
        console.error('❌ Login failed:', err.message);
        if (err.originalError) {
            console.error('   Details:', err.originalError.message);
        }
    } finally {
        process.exit(0);
    }
}

testAuth();
