
const sql = require('mssql');

const config = {
    server: '104.46.127.151',
    user: 'sa_intelisis9',
    password: 'DEFINITELY_WRONG_PASSWORD_12345', // Contraseña incorrecta deliberada
    database: 'Cantera',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 5000
    }
};

async function testBadPass() {
    console.log(`Testing with WRONG password to ${config.server}...`);
    try {
        await sql.connect(config);
        console.log('✅ Connected (Unexpected!)');
    } catch (err) {
        console.log('❌ Error received:', err.message);
        console.log('   Code:', err.code);

        if (err.message.includes('Login failed')) {
            console.log('\n💡 CONCLUSION: The server REJECTED the password. This means connectivity IS working!');
        } else if (err.message.includes('ECONNRESET')) {
            console.log('\n💡 CONCLUSION: The connection was cut BEFORE checking the password. The password is irrelevant right now.');
        }
    } finally {
        process.exit(0);
    }
}

testBadPass();
