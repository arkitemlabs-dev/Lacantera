// Test directo del stored procedure con logging completo
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

import sql from 'mssql';
import { getERPConnection } from './src/lib/database/multi-tenant-connection';

async function testSPDirect() {
    const proveedorId = 'P00443';
    const nuevoTelefono = `555${Date.now().toString().slice(-7)}`; // Teléfono único para cada prueba

    try {
        console.log('='.repeat(80));
        console.log('TEST DIRECTO DEL STORED PROCEDURE');
        console.log('='.repeat(80));

        const pool = await getERPConnection('la-cantera');
        console.log('✅ Conectado al ERP');

        // 1. CONSULTAR DATOS ACTUALES
        console.log('\n📋 1. CONSULTANDO DATOS ACTUALES...');
        const consultaAntes = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosAntes = consultaAntes.recordset[0];
        console.log('Teléfono ANTES:', datosAntes?.Telefonos);
        console.log('Nombre ANTES:', datosAntes?.Nombre);

        // 2. ACTUALIZAR CON EL SP
        console.log(`\n📝 2. ACTUALIZANDO TELÉFONO A: ${nuevoTelefono}...`);

        const request = pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'M')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .input('Nombre', sql.VarChar(100), datosAntes.Nombre)
            .input('Telefonos', sql.VarChar(100), nuevoTelefono);

        console.log('\n📤 Parámetros enviados al SP:');
        console.log({
            Empresa: '06',
            Operacion: 'M',
            CveProv: proveedorId,
            Nombre: datosAntes.Nombre,
            Telefonos: nuevoTelefono
        });

        const updateResult = await request.execute('spDatosProveedor');

        console.log('\n📥 Resultado del SP:');
        console.log('Recordsets:', updateResult.recordsets.length);
        console.log('RowsAffected:', updateResult.rowsAffected);
        console.log('ReturnValue:', updateResult.returnValue);

        if (updateResult.recordset && updateResult.recordset.length > 0) {
            console.log('Primer registro:', updateResult.recordset[0]);
        }

        // 3. ESPERAR UN MOMENTO
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. RE-CONSULTAR PARA VERIFICAR
        console.log('\n🔍 3. VERIFICANDO CAMBIOS...');
        const consultaDespues = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosDespues = consultaDespues.recordset[0];
        console.log('Teléfono DESPUÉS:', datosDespues?.Telefonos);

        // 5. COMPARAR
        console.log('\n' + '='.repeat(80));
        console.log('RESULTADO:');
        console.log('='.repeat(80));
        console.log('Teléfono ANTES:   ', datosAntes?.Telefonos);
        console.log('Teléfono ESPERADO:', nuevoTelefono);
        console.log('Teléfono DESPUÉS: ', datosDespues?.Telefonos);

        if (datosDespues?.Telefonos === nuevoTelefono) {
            console.log('\n✅ ¡ÉXITO! El cambio se guardó correctamente');
        } else {
            console.log('\n❌ FALLO: El cambio NO se guardó');
            console.log('El stored procedure NO está persistiendo los datos');
        }

        // 6. CONSULTA DIRECTA A LA TABLA (sin SP)
        console.log('\n🔍 4. CONSULTA DIRECTA A LA TABLA Prov...');
        const directQuery = await pool.request()
            .input('codigo', sql.VarChar(10), proveedorId)
            .query('SELECT Proveedor, Nombre, Telefonos FROM Prov WHERE Proveedor = @codigo');

        console.log('Teléfono en tabla Prov:', directQuery.recordset[0]?.Telefonos);

    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

testSPDirect();
