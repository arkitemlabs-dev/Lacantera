
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

async function checkAllDbsDetailed() {
    const dbs = ['Cantera', 'Cantera_ajustes', 'GALBD_PRUEBAS', 'Peralillo_Ajustes'];
    const config = {
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        server: process.env.MSSQL_ERP_SERVER,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        const pool = await sql.connect(config);
        for (const db of dbs) {
            console.log(`\n=== 🔎 REVISANDO BASE DE DATOS: ${db} ===`);
            try {
                // Ver parámetros
                const params = await pool.request().query(`
                    SELECT 
                        PARAMETER_NAME as [Parametro], 
                        DATA_TYPE as [Tipo], 
                        CHARACTER_MAXIMUM_LENGTH as [Longitud],
                        IS_RESULT as [EsResultado]
                    FROM ${db}.INFORMATION_SCHEMA.PARAMETERS 
                    WHERE SPECIFIC_NAME = 'spGeneraRemisionCompra'
                    ORDER BY ORDINAL_POSITION
                `);

                if (params.recordset.length > 0) {
                    console.table(params.recordset);
                } else {
                    console.log(`❌ El SP 'spGeneraRemisionCompra' NO existe en ${db}`);
                }

                // Ver si está encriptado o si podemos leerlo
                const definition = await pool.request().query(`
                    USE ${db};
                    SELECT OBJECT_DEFINITION(OBJECT_ID('spGeneraRemisionCompra')) as def
                `);

                if (definition.recordset[0] && definition.recordset[0].def) {
                    console.log(`✅ Definición encontrada en ${db} (se muestra cabecera):`);
                    console.log(definition.recordset[0].def.split('\n').filter(l => l.includes('@')).slice(0, 10).join('\n'));
                } else if (params.recordset.length > 0) {
                    console.log(`⚠️  SP existe pero la definición está encriptada o no hay permisos en ${db}`);
                }

            } catch (e) {
                console.log(`🛑 Error al consultar ${db}: ${e.message}`);
            }
        }
        await pool.close();
    } catch (error) {
        console.error('❌ Error de Conexión:', error.message);
    }
}

checkAllDbsDetailed();
