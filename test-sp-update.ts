
// test-update-simple.ts
import sql from 'mssql';
import { getERPConnection } from './src/lib/database/multi-tenant-connection';

async function testUpdate() {
    try {
        const pool = await getERPConnection('la-cantera');
        console.log('Connected to ERP');

        // Primero consultar los datos actuales
        const consultaRequest = pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'C')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), 'P00443');

        const consultaResult = await consultaRequest.execute('spDatosProveedor');
        const actual = consultaResult.recordset[0];

        console.log('--- DATOS ACTUALES ---');
        console.log(JSON.stringify(actual, null, 2));

        // Ahora intentar modificar
        const updateRequest = pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'M')
            .input('Rfc', sql.VarChar(20), '')
            .input('Proveedor', sql.VarChar(200), '')
            .input('CveProv', sql.VarChar(10), 'P00443')
            .input('Nombre', sql.VarChar(100), actual.Nombre || '')
            .input('NombreC', sql.VarChar(20), actual.NombreCorto || '')
            .input('RfcProv', sql.VarChar(15), 'ACE140813E29')  // <-- RFC nuevo
            .input('Curp', sql.VarChar(30), '')
            .input('Regimen', sql.VarChar(30), '')
            .input('Direccion', sql.VarChar(100), actual.Direccion || '')
            .input('NumExt', sql.VarChar(20), '')
            .input('NumInt', sql.VarChar(20), '')
            .input('EntreCalles', sql.VarChar(100), '')
            .input('Colonia', sql.VarChar(100), actual.Colonia || '')
            .input('Poblacion', sql.VarChar(100), actual.Poblacion || '')
            .input('Estado', sql.VarChar(30), actual.Estado || '')
            .input('Pais', sql.VarChar(100), actual.Pais || '')
            .input('CodigoPostal', sql.VarChar(15), actual.CodigoPostal || '')
            .input('Contacto1', sql.VarChar(50), '')
            .input('Contacto2', sql.VarChar(50), '')
            .input('Email1', sql.VarChar(50), actual.eMail1 || '')
            .input('Email2', sql.VarChar(50), '')
            .input('Telefonos', sql.VarChar(100), actual.Telefonos || '')
            .input('Fax', sql.VarChar(50), '')
            .input('Extension1', sql.VarChar(10), '')
            .input('Extension2', sql.VarChar(10), '')
            .input('BancoSucursal', sql.VarChar(50), '')
            .input('Cuenta', sql.VarChar(20), '')
            .input('Beneficiario', sql.Int, 0)
            .input('BeneficiarioNombre', sql.VarChar(100), '')
            .input('LeyendaCheque', sql.VarChar(100), '');

        const updateResult = await updateRequest.execute('spDatosProveedor');
        console.log('--- RESULTADO UPDATE ---');
        console.log(JSON.stringify(updateResult.recordset, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testUpdate();