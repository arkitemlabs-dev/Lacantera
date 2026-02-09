// Test de creación de proveedor (operación 'A') sin RFC, Clave ni Nombre
// Para ver si el SP genera automáticamente una clave de proveedor
// @ts-ignore
require('dotenv').config({ path: '.env.local' });

const sql = require('mssql');

async function testCrearProveedorSinDatos() {
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

    console.log(' Conectando...\n');

    try {
        const pool = await sql.connect(config);
        console.log(' Conectado\n');

        console.log('='.repeat(80));
        console.log('TEST: Crear proveedor (operación A) SIN RFC, Clave ni Nombre');
        console.log('='.repeat(80));
        console.log('\nSegún tu compañero de BD, el SP debería:');
        console.log('1. Generar automáticamente una clave de proveedor');
        console.log('2. Retornar el mismo usuario pero con una clave diferente\n');

        // Ejecutar SP con operación 'A' (Alta) sin datos
        console.log(' Ejecutando SP con operación A...');
        console.log('Parámetros enviados:');

        const params = {
            Empresa: '06',
            Operacion: 'A', // ← ALTA (crear)
            Rfc: '',        // ← Vacío
            Proveedor: '',  // ← Vacío (nombre)
            CveProv: '',    // ← Vacío (clave)
            // Todos los demás parámetros en null/undefined
            Nombre: null,
            NombreC: null,
            RfcProv: null,
            Curp: null,
            Regimen: null,
            Direccion: null,
            NumExt: null,
            NumInt: null,
            EntreCalles: null,
            Colonia: null,
            Poblacion: null,
            Estado: null,
            Pais: null,
            Codigopostal: null,
            Contacto1: null,
            Contacto2: null,
            Email1: null,
            Email2: null,
            Telefonos: null,
            Fax: null,
            Extension1: null,
            Extension2: null,
            BancoSucursal: null,
            Cuenta: null,
            Beneficiario: null,
            BeneficiarioNombre: null,
            LeyendaCheque: null
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

        console.log('\n Ejecutando stored procedure...\n');
        const result = await request.execute('spDatosProveedor');

        console.log('='.repeat(80));
        console.log(' RESULTADO DEL SP:');
        console.log('='.repeat(80));
        console.log('returnValue:', result.returnValue);
        console.log('rowsAffected:', result.rowsAffected);
        console.log('recordsets.length:', result.recordsets.length);

        console.log('\n Recordsets:');
        result.recordsets.forEach((recordset, index) => {
            console.log(`\nRecordset ${index}:`);
            console.log('Rows:', recordset.length);
            if (recordset.length > 0) {
                console.log('Data:', JSON.stringify(recordset, null, 2));
            }
        });

        // Buscar si hay una clave de proveedor generada
        console.log('\n' + '='.repeat(80));
        console.log('ANÁLISIS:');
        console.log('='.repeat(80));

        let claveGenerada = null;

        // Buscar en todos los recordsets
        for (const recordset of result.recordsets) {
            for (const row of recordset) {
                // Buscar campos que puedan contener la clave
                if (row.Proveedor || row.CveProv || row.Clave || row.Codigo) {
                    claveGenerada = row.Proveedor || row.CveProv || row.Clave || row.Codigo;
                    console.log(' Clave de proveedor generada:', claveGenerada);
                    console.log('Datos completos del registro:', JSON.stringify(row, null, 2));
                    break;
                }
            }
            if (claveGenerada) break;
        }

        if (!claveGenerada) {
            console.log('  No se encontró una clave de proveedor en la respuesta');
            console.log('El SP puede haber retornado un mensaje o error');
        }

        // Verificar si se creó consultando
        if (claveGenerada) {
            console.log('\n🔍 Verificando si el proveedor se creó...');
            const verificacion = await pool.request()
                .input('Empresa', sql.VarChar(10), '06')
                .input('Operacion', sql.VarChar(1), 'C')
                .input('Rfc', sql.VarChar(20), '')
                .input('Proveedor', sql.VarChar(200), '')
                .input('CveProv', sql.VarChar(10), claveGenerada)
                .execute('spDatosProveedor');

            if (verificacion.recordset && verificacion.recordset.length > 0) {
                console.log('Proveedor encontrado:');
                console.log(JSON.stringify(verificacion.recordset[0], null, 2));
            } else {
                console.log(' No se encontró el proveedor con clave:', claveGenerada);
            }
        }

        await pool.close();

    } catch (error) {
        console.error('\n Error:', error.message);
        console.error('\nDetalles completos:');
        console.error(error);
    }
}

testCrearProveedorSinDatos();
