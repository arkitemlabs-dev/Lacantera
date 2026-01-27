// Test simple para verificar si el SP guarda datos
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

async function testSPSimple() {
    const proveedorId = 'P00443';
    const nuevoTelefono = `555${Date.now().toString().slice(-7)}`;

    // Configuración directa
    const config = {
        server: process.env.MSSQL_ERP_SERVER || 'localhost',
        database: 'Cantera_Ajustes', // Base de pruebas
        user: process.env.MSSQL_ERP_USER,
        password: process.env.MSSQL_ERP_PASSWORD,
        options: {
            encrypt: process.env.MSSQL_ERP_ENCRYPT === 'true',
            trustServerCertificate: process.env.MSSQL_ERP_TRUST_CERT === 'true',
            enableArithAbort: true,
        },
    };

    console.log('Conectando a:', config.server, '/', config.database);

    try {
        const pool = await sql.connect(config);
        console.log('✅ Conectado');

        // 1. CONSULTAR ANTES
        console.log('\n1️⃣ Consultando datos actuales...');
        const antes = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosAntes = antes.recordset[0];
        console.log('Teléfono ANTES:', datosAntes?.Telefonos);

        // 2. ACTUALIZAR
        console.log(`\n2️⃣ Actualizando teléfono a: ${nuevoTelefono}`);
        const update = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'M')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .input('Nombre', sql.VarChar(100), datosAntes.Nombre)
            .input('Telefonos', sql.VarChar(100), nuevoTelefono)
            .execute('spDatosProveedor');

        console.log('Resultado SP:', update.recordset[0]);
        console.log('RowsAffected:', update.rowsAffected);

        // 3. ESPERAR
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. CONSULTAR DESPUÉS
        console.log('\n3️⃣ Verificando cambios...');
        const despues = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosDespues = despues.recordset[0];
        console.log('Teléfono DESPUÉS:', datosDespues?.Telefonos);

        // 5. RESULTADO
        console.log('\n' + '='.repeat(60));
        if (datosDespues?.Telefonos === nuevoTelefono) {
            console.log('✅ ÉXITO - El cambio se guardó');
        } else {
            console.log('❌ FALLO - El cambio NO se guardó');
            console.log('Esperado:', nuevoTelefono);
            console.log('Obtenido:', datosDespues?.Telefonos);
        }
        console.log('='.repeat(60));

        await pool.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSPSimple();
