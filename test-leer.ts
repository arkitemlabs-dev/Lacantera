// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { getProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testLeer() {
    const proveedorId = 'P00443';
    const empresa = 'la-cantera';

    try {
        console.log(`--- Consultando ${proveedorId} ---`);
        const proveedor = await getProveedorConSP({ empresa, codigo: proveedorId });

        if (!proveedor) {
            console.log('Proveedor no encontrado');
            return;
        }

        console.log('\n--- DATOS DEL PROVEEDOR ---');
        console.log(JSON.stringify(proveedor, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);  // 👈 Esto fuerza que termine
    }
}

testLeer();