// Script para analizar el resultado completo del SP spDatosProveedor
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

async function analizarSP() {
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

    console.log('🔌 Conectando...\n');

    try {
        const pool = await sql.connect(config);

        // 1. CONSULTAR DATOS ACTUALES
        console.log('1️⃣ Consultando datos actuales...');
        const consulta = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosAntes = consulta.recordset[0];
        console.log('Teléfono ANTES:', datosAntes?.Telefonos);
        console.log('Nombre:', datosAntes?.Nombre);

        // 2. EJECUTAR SP DE ACTUALIZACIÓN CON TODOS LOS PARÁMETROS
        console.log(`\n2️⃣ Ejecutando SP para actualizar teléfono a: ${nuevoTelefono}`);
        console.log('Parámetros enviados:');

        const params = {
            Empresa: '06',
            Operacion: 'M',
            Rfc: '',
            Proveedor: '',
            CveProv: proveedorId,
            Nombre: datosAntes.Nombre,
            NombreC: datosAntes.NombreCorto,
            RfcProv: datosAntes.RFC,
            Curp: datosAntes.CURP,
            Regimen: datosAntes.FiscalRegimen,
            Direccion: datosAntes.Direccion,
            NumExt: datosAntes.DireccionNumero,
            NumInt: datosAntes.DireccionNumeroInt,
            EntreCalles: datosAntes.EntreCalles,
            Colonia: datosAntes.Colonia,
            Poblacion: datosAntes.Poblacion,
            Estado: datosAntes.Estado,
            Pais: datosAntes.Pais,
            Codigopostal: datosAntes.CodigoPostal,
            Contacto1: datosAntes.Contacto1,
            Contacto2: datosAntes.Contacto2,
            Email1: datosAntes.eMail1,
            Email2: datosAntes.eMail2,
            Telefonos: nuevoTelefono, // ← CAMBIO AQUÍ
            Fax: datosAntes.Fax,
            Extension1: datosAntes.Extencion1,
            Extension2: datosAntes.Extencion2,
            BancoSucursal: datosAntes.ProvBancoSucursal,
            Cuenta: datosAntes.ProvCuenta,
            Beneficiario: datosAntes.Beneficiario,
            BeneficiarioNombre: datosAntes.BeneficiarioNombre,
            LeyendaCheque: datosAntes.LeyendaCheque
        };

        console.log(JSON.stringify(params, null, 2));

        const request = pool.request();
        for (const [key, value] of Object.entries(params)) {
            if (key === 'Beneficiario') {
                request.input(key, sql.Int, value);
            } else {
                request.input(key, sql.VarChar, value);
            }
        }

        const updateResult = await request.execute('spDatosProveedor');

        console.log('\n📥 RESULTADO COMPLETO DEL SP:');
        console.log('='.repeat(70));
        console.log('returnValue:', updateResult.returnValue);
        console.log('rowsAffected:', updateResult.rowsAffected);
        console.log('recordsets.length:', updateResult.recordsets.length);

        console.log('\n📋 Recordsets:');
        updateResult.recordsets.forEach((recordset, index) => {
            console.log(`\nRecordset ${index}:`);
            console.log('Columns:', Object.keys(recordset.columns || {}));
            console.log('Rows:', recordset.length);
            if (recordset.length > 0) {
                console.log('First row:', JSON.stringify(recordset[0], null, 2));
            }
        });

        console.log('\n📋 Output parameters:');
        console.log(updateResult.output);

        // 3. ESPERAR
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 4. VERIFICAR
        console.log('\n3️⃣ Verificando si el cambio se guardó...');
        const verificacion = await pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), proveedorId)
            .execute('spDatosProveedor');

        const datosDespues = verificacion.recordset[0];
        console.log('Teléfono DESPUÉS:', datosDespues?.Telefonos);

        // 5. RESULTADO
        console.log('\n' + '='.repeat(70));
        console.log('ANÁLISIS:');
        console.log('='.repeat(70));
        console.log('Teléfono ANTES:    ', datosAntes?.Telefonos);
        console.log('Teléfono ESPERADO: ', nuevoTelefono);
        console.log('Teléfono DESPUÉS:  ', datosDespues?.Telefonos);

        if (datosDespues?.Telefonos === nuevoTelefono) {
            console.log('\n✅ El SP SÍ guardó el cambio');
        } else {
            console.log('\n❌ El SP NO guardó el cambio');
            console.log('\n🔍 POSIBLES CAUSAS:');
            console.log('1. El SP no tiene COMMIT TRANSACTION');
            console.log('2. El SP tiene un ROLLBACK implícito');
            console.log('3. El SP tiene una condición que impide el UPDATE');
            console.log('4. El SP está en una transacción que no se confirma');
            console.log('\n💡 SOLUCIÓN:');
            console.log('Necesitas revisar el código del SP en SQL Server Management Studio');
            console.log('Busca: BEGIN TRANSACTION, COMMIT, ROLLBACK');
        }

        await pool.close();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    }
}

analizarSP();
