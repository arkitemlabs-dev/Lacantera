// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { actualizarProveedorConSP, getProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testModify() {
    const proveedorId = 'P00443';
    const empresa = 'la-cantera';

    try {
        console.log(`--- 1. Consultando datos actuales de ${proveedorId} ---`);
        const actual = await getProveedorConSP({ empresa, codigo: proveedorId });

        if (!actual) {
            console.error('Proveedor no encontrado');
            return;
        }

        console.log('RFC Actual:', actual.RFC);
        console.log('Nombre Actual:', actual.Nombre);

        // 👇 AGREGA ESTO: Ver TODOS los datos que vienen del ERP
        console.log('\n--- DATOS COMPLETOS DEL ERP ---');
        console.log(JSON.stringify(actual, null, 2));

        const nuevoRFC = 'ACE140813E29';

        console.log(`\n--- 2. Intentando actualizar RFC a: ${nuevoRFC} ---`);

        const editData = {
            cveProv: proveedorId,
            nombre: actual.Nombre,
            nombreCorto: actual.NombreCorto,
            rfc: nuevoRFC,
            empresa: empresa,
            activo: true,
            direccion: actual.Direccion,
            colonia: actual.Colonia,
            ciudad: actual.Poblacion,
            estado: actual.Estado,
            pais: actual.Pais,
            codigoPostal: actual.CodigoPostal,
            telefonos: actual.Telefonos,
            email1: actual.eMail1
        };

        // 👇 AGREGA ESTO: Ver qué estás enviando
        console.log('\n--- DATOS A ENVIAR ---');
        console.log(JSON.stringify(editData, null, 2));

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

testModify();