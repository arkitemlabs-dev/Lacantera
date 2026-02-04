
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function debugSP() {
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_ajustes', // Usamos la de pruebas para no afectar producción
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        console.log('--- 1. ANALIZANDO PARÁMETROS DE spGeneraRemisionCompra ---');
        const pool = await sql.connect(config);
        const params = await pool.request().query(`
            SELECT 
                PARAMETER_NAME, 
                DATA_TYPE, 
                CHARACTER_MAXIMUM_LENGTH,
                PARAMETER_MODE
            FROM INFORMATION_SCHEMA.PARAMETERS 
            WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
            ORDER BY ORDINAL_POSITION
        `);
        console.table(params.recordset);

        console.log('\n--- 2. ANALIZANDO DEFINICIÓN DEL CÓDIGO (Primeras 20 líneas) ---');
        const definition = await pool.request().query(`
            SELECT TOP 1 OBJECT_DEFINITION(OBJECT_ID('spGeneraRemisionCompra')) as def
        `);
        if (definition.recordset[0] && definition.recordset[0].def) {
            console.log(definition.recordset[0].def.substring(0, 1000));
        } else {
            console.log('No se pudo obtener la definición (posiblemente encriptado o sin permisos)');
        }

        console.log('\n--- 3. PRUEBA DE EJECUCIÓN CONTROLADA (Simulación) ---');
        // Intentamos una ejecución con parámetros vacíos para ver exactamente qué error de SQL regresa el motor
        try {
            await pool.request()
                .input('Empresa', sql.VarChar, '06')
                .execute('spGeneraRemisionCompra');
        } catch (e) {
            console.log('Resultado de ejecución incompleta (para ver errores de parámetros):');
            console.log(e.message);
        }

        await pool.close();
    } catch (error) {
        console.error('Error de conexión/query:', error.message);
    }
}

debugSP();
