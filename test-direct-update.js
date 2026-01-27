// Test para verificar si podemos actualizar directamente la tabla Prov
// Esto nos dirá si el problema es del SP o de permisos/transacciones
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

async function testDirectUpdate() {
    const proveedorId = 'P00443';
    const nuevoTelefono = `555${Date.now().toString().slice(-7)}`;

    const config = {
        server: process.env.MSSQL_ERP_SERVER,
        database: 'Cantera_Ajustes',
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true',
            enableArithAbort: true,
        },
    };

    console.log('🔌 Conectando a:', config.server, '/', config.database);

    try {
        const pool = await sql.connect(config);
        console.log('✅ Conectado\n');

        // 1. CONSULTAR ANTES
        console.log('1️⃣ Consultando datos actuales...');
        const antes = await pool.request()
            .input('codigo', sql.VarChar(10), proveedorId)
            .query('SELECT Proveedor, Nombre, Telefonos FROM Prov WHERE Proveedor = @codigo');

        const datosAntes = antes.recordset[0];
        console.log('Teléfono ANTES:', datosAntes?.Telefonos);
        console.log('Nombre:', datosAntes?.Nombre);

        // 2. ACTUALIZAR DIRECTAMENTE LA TABLA
        console.log(`\n2️⃣ Actualizando directamente la tabla Prov...`);
        console.log(`Nuevo teléfono: ${nuevoTelefono}`);

        const update = await pool.request()
            .input('codigo', sql.VarChar(10), proveedorId)
            .input('telefono', sql.VarChar(100), nuevoTelefono)
            .query('UPDATE Prov SET Telefonos = @telefono WHERE Proveedor = @codigo');

        console.log('RowsAffected:', update.rowsAffected[0]);

        // 3. ESPERAR
        console.log('\n⏳ Esperando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 4. CONSULTAR DESPUÉS
        console.log('\n3️⃣ Verificando cambios...');
        const despues = await pool.request()
            .input('codigo', sql.VarChar(10), proveedorId)
            .query('SELECT Proveedor, Nombre, Telefonos FROM Prov WHERE Proveedor = @codigo');

        const datosDespues = despues.recordset[0];
        console.log('Teléfono DESPUÉS:', datosDespues?.Telefonos);

        // 5. RESULTADO
        console.log('\n' + '='.repeat(70));
        console.log('RESULTADO DEL TEST:');
        console.log('='.repeat(70));
        console.log('Teléfono ANTES:    ', datosAntes?.Telefonos);
        console.log('Teléfono ESPERADO: ', nuevoTelefono);
        console.log('Teléfono DESPUÉS:  ', datosDespues?.Telefonos);
        console.log('='.repeat(70));

        if (datosDespues?.Telefonos === nuevoTelefono) {
            console.log('\n✅ ÉXITO - El UPDATE directo funciona');
            console.log('📌 CONCLUSIÓN: El problema está en el stored procedure spDatosProveedor');
            console.log('   El SP probablemente:');
            console.log('   - No está haciendo COMMIT');
            console.log('   - Tiene un ROLLBACK implícito');
            console.log('   - Tiene una condición que impide el UPDATE');
        } else {
            console.log('\n❌ FALLO - Ni siquiera el UPDATE directo funciona');
            console.log('📌 CONCLUSIÓN: Problema de permisos o transacciones en la BD');
        }

        await pool.close();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nSi el error es de permisos, significa que el usuario no puede hacer UPDATE');
        console.error('Si el error es de transacción, hay un problema con COMMIT/ROLLBACK');
    }
}

testDirectUpdate();
