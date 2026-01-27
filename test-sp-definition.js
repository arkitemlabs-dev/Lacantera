// Script para obtener la definición del stored procedure
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

async function obtenerDefinicionSP() {
    const config = {
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_Ajustes',
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true',
            enableArithAbort: true,
        },
    };

    console.log('🔌 Conectando...\n');

    try {
        const pool = await sql.connect(config);

        // Obtener parámetros del SP
        console.log('📋 Parámetros del stored procedure spDatosProveedor:\n');
        const params = await pool.request().query(`
            SELECT 
                PARAMETER_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                PARAMETER_MODE
            FROM INFORMATION_SCHEMA.PARAMETERS
            WHERE SPECIFIC_NAME = 'spDatosProveedor'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Total de parámetros:', params.recordset.length);
        console.log('='.repeat(80));

        params.recordset.forEach((param, index) => {
            const length = param.CHARACTER_MAXIMUM_LENGTH ? `(${param.CHARACTER_MAXIMUM_LENGTH})` : '';
            console.log(`${index + 1}. ${param.PARAMETER_NAME}`);
            console.log(`   Tipo: ${param.DATA_TYPE}${length}`);
            console.log(`   Modo: ${param.PARAMETER_MODE}`);
            console.log('');
        });

        // Intentar obtener el código del SP (puede no funcionar si no tienes permisos)
        console.log('\n📝 Intentando obtener el código del SP...\n');
        try {
            const code = await pool.request().query(`
                SELECT OBJECT_DEFINITION(OBJECT_ID('spDatosProveedor')) AS SPCode
            `);

            if (code.recordset[0]?.SPCode) {
                console.log('Código del SP:');
                console.log('='.repeat(80));
                console.log(code.recordset[0].SPCode);
            } else {
                console.log('⚠️  No se pudo obtener el código del SP (puede requerir permisos especiales)');
            }
        } catch (err) {
            console.log('⚠️  No se pudo obtener el código del SP:', err.message);
        }

        await pool.close();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

obtenerDefinicionSP();
