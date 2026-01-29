
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
        connectTimeout: 30000,
        // Attempt to allow legacy TLS
        cryptoCredentialsDetails: {
            minVersion: 'TLSv1',
            ciphers: 'DEFAULT:@SECLEVEL=0'
        }
    }
};

async function testAuthLegacy() {
    console.log(`Connecting to ${config.server} with LEGACY TLS settings...`);
    try {
        await sql.connect(config);
        console.log('✅ Connection successful with Intelisis credentials (Legacy TLS)!');
        await sql.close();
    } catch (err) {
        console.error('❌ Login failed:', err.message);
        if (err.originalError) {
            console.error('   Details:', err.originalError.message);
        }
        if (err.code === 'ECONNRESET') {
            console.error('   👉 Still getting ECONNRESET? The server might be using a very old SSL protocol or cipher suite not supported by Node.js 22.');
        }
    } finally {
        process.exit(0);
    }
}

testAuthLegacy();
