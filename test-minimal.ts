
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { actualizarProveedorConSP, getProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testMinimal() {
    const proveedorId = 'P00443';
    const empresa = 'la-cantera';

    try {
        console.log(`--- Test Minimal Update ---`);

        const editData = {
            cveProv: proveedorId,
            nombre: 'ARQUITECTURA Y CONSULTO RIA EMPRESARIAL SA DE CV', // Sin saltos de línea
            rfc: 'ACE140813E29',
            empresa: empresa,
            activo: true
        };

        const result = await actualizarProveedorConSP(editData);

        if (result.success) {
            console.log('✅ Éxito:', result.message);
        } else {
            console.error('❌ Error:', result.error);
        }

    } catch (error) {
        console.error('Exception:', error);
    }
}

testMinimal();
