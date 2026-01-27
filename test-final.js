// Test final para verificar que el SP guarda correctamente con los cambios
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const { actualizarProveedorConSP, getProveedorConSP } = require('./src/lib/database/admin-proveedores-queries');

async function testFinal() {
    const proveedorId = 'P00443';
    const empresa = 'la-cantera';
    const nuevoTelefono = `555${Date.now().toString().slice(-7)}`;

    try {
        console.log('='.repeat(80));
        console.log('TEST FINAL - Actualización con SP (strings vacíos → undefined)');
        console.log('='.repeat(80));

        // 1. CONSULTAR ANTES
        console.log('\n1️⃣ Consultando datos actuales...');
        const antes = await getProveedorConSP({ empresa, codigo: proveedorId });
        console.log('Teléfono ANTES:', antes?.Telefonos);
        console.log('Nombre:', antes?.Nombre);

        // 2. ACTUALIZAR CON DATOS LIMPIOS
        console.log(`\n2️⃣ Actualizando teléfono a: ${nuevoTelefono}`);

        const dataToUpdate = {
            cveProv: proveedorId,
            nombre: antes.Nombre,
            nombreCorto: antes.NombreCorto,
            rfc: antes.RFC,
            curp: antes.CURP || '', // String vacío → se convertirá a undefined
            regimen: antes.FiscalRegimen || '',
            direccion: antes.Direccion || '',
            numeroExterior: antes.DireccionNumero || '',
            numeroInterior: antes.DireccionNumeroInt || '',
            entreCalles: antes.EntreCalles || '',
            colonia: antes.Colonia,
            ciudad: antes.Poblacion,
            estado: antes.Estado,
            pais: antes.Pais,
            codigoPostal: antes.CodigoPostal,
            contactoPrincipal: antes.Contacto1 || '',
            contactoSecundario: antes.Contacto2 || '',
            email1: antes.eMail1 || '',
            email2: antes.eMail2 || '',
            telefonos: nuevoTelefono, // ← CAMBIO AQUÍ
            fax: antes.Fax || '',
            extension1: antes.Extencion1 || '',
            extension2: antes.Extencion2 || '',
            banco: antes.ProvBancoSucursal || '',
            cuentaBancaria: antes.ProvCuenta || '',
            beneficiario: antes.Beneficiario || 0,
            nombreBeneficiario: antes.BeneficiarioNombre || '',
            leyendaCheque: antes.LeyendaCheque || '',
            empresa: empresa,
            activo: true
        };

        console.log('\n📦 Datos a enviar:');
        console.log('Teléfono:', dataToUpdate.telefonos);
        console.log('Nombre:', dataToUpdate.nombre);

        const result = await actualizarProveedorConSP(dataToUpdate);

        console.log('\n📥 Resultado del SP:');
        console.log('Success:', result.success);
        console.log('Message:', result.message);
        console.log('Error:', result.error);

        if (!result.success) {
            console.log('\n❌ FALLO en la actualización');
            console.log('Detalles:', result.error);
            return;
        }

        // 3. ESPERAR
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. VERIFICAR
        console.log('\n3️⃣ Verificando cambios...');
        const despues = await getProveedorConSP({ empresa, codigo: proveedorId });
        console.log('Teléfono DESPUÉS:', despues?.Telefonos);

        // 5. RESULTADO
        console.log('\n' + '='.repeat(80));
        console.log('RESULTADO FINAL:');
        console.log('='.repeat(80));
        console.log('Teléfono ANTES:    ', antes?.Telefonos);
        console.log('Teléfono ESPERADO: ', nuevoTelefono);
        console.log('Teléfono DESPUÉS:  ', despues?.Telefonos);
        console.log('='.repeat(80));

        if (despues?.Telefonos === nuevoTelefono) {
            console.log('\n✅✅✅ ¡ÉXITO! El SP guardó correctamente');
            console.log('🎉 El problema está RESUELTO');
        } else {
            console.log('\n❌ El SP aún no guarda');
            console.log('💡 Revisar logs del SP para más detalles');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

testFinal();
