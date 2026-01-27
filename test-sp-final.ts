
// test-sp-final.ts
require('dotenv').config({ path: '.env.local' });
const { actualizarProveedorConSP, getProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testFinal() {
    const empresa = 'la-cantera';
    const codigo = 'P00443';

    try {
        console.log('--- 1. CONSULTANDO DATOS ACTUALES ---');
        const res1 = await getProveedorConSP({ empresa, codigo });
        if (!res1) {
            console.error('No se pudo encontrar el proveedor P00443');
            return;
        }
        const original = res1;
        console.log('Teléfono actual:', original.Telefonos);

        const nuevoTelefono = 'SP-FIX-' + Math.floor(Math.random() * 1000);
        console.log('--- 2. INTENTANDO MODIFICAR CON SP ---');
        console.log('Nuevo teléfono:', nuevoTelefono);

        const data = {
            empresa,
            cveProv: codigo,
            nombre: original.Nombre,
            rfc: original.RFC,
            telefonos: nuevoTelefono,
            activo: true
        };

        const res2 = await actualizarProveedorConSP(data);
        console.log('Resultado del SP:', res2.success, res2.message || res2.error);

        console.log('--- 3. VERIFICANDO PERSISTENCIA ---');
        await new Promise(r => setTimeout(r, 2000));
        const res3 = await getProveedorConSP({ empresa, codigo });
        console.log('Teléfono tras modificación:', res3.Telefonos);

        if (res3.data.Telefonos === nuevoTelefono) {
            console.log('✅ ÉXITO: El Stored Procedure está funcionando correctamente.');
        } else {
            console.log('❌ FALLO: El Stored Procedure sigue sin persistir los cambios.');
        }

    } catch (err) {
        console.error('Error en el test:', err);
    } finally {
        process.exit(0);
    }
}

testFinal();
