
// test-alta-proveedor.ts
require('dotenv').config({ path: '.env.local' });
const { crearProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testAlta() {
    const data = {
        empresa: 'la-cantera', // Se mapeará a '06'
        nombre: 'PROVEEDOR TEST ALTA ' + Date.now(),
        rfc: 'TEST' + Math.floor(Math.random() * 100000000),
        nombreCorto: 'TEST',
        activo: true
    };

    try {
        console.log('--- PROBANDO ALTA DE PROVEEDOR ---');
        console.log('RFC:', data.rfc);
        const result = await crearProveedorConSP(data);
        console.log('Resultado:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('✅ El SP reportó éxito en la creación.');
            console.log('ID asignado:', result.data[0]?.Proveedor || result.data[0]?.Codigo || 'Desconocido');
        } else {
            console.log('❌ El SP falló en la creación:', result.error);
        }
    } catch (err) {
        console.error('Error durante el test:', err);
    } finally {
        process.exit(0);
    }
}

testAlta();
