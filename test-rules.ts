
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { getStoredProcedures } = require('./src/lib/database/stored-procedures');
const sql = require('mssql');

async function testRules() {
    try {
        const sp = getStoredProcedures();

        console.log('--- TEST 1: Buscar P00443 por código ---');
        const result1 = await sp.spDatosProveedor({
            empresa: 'la-cantera',
            operacion: 'C',
            cveProv: 'P00443'
        });
        console.log('Success:', result1.success);
        console.log('Found:', result1.data?.length);
        if (result1.data?.length > 0) {
            console.log('Name:', result1.data[0].Nombre);
        }

        console.log('\n--- TEST 2: Intentar buscar por RFC (Debería ignorarlo y buscar todos o fallar si el SP lo requiere) ---');
        // Como ahora el código vacía el parámetro RFC en 'C', el SP recibirá RFC vacío
        const result2 = await sp.spDatosProveedor({
            empresa: 'la-cantera',
            operacion: 'C',
            rfc: 'GURJ850101XXX' // RFC ficticio
        });
        console.log('Success:', result2.success);
        console.log('Count (should be all or 0 depending on SP logic with empty params):', result2.data?.length);

    } catch (error) {
        console.error('Error:', error);
    }
}

testRules();
