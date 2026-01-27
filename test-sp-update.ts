
import sql from 'mssql';
import { getERPConnection } from './src/lib/database/multi-tenant-connection.ts';

async function testUpdate() {
    try {
        const pool = await getERPConnection('la-cantera');
        console.log('Connected to ERP');

        const request = pool.request()
            .input('Empresa', sql.VarChar(10), '06')
            .input('Operacion', sql.VarChar(1), 'M')
            .input('Proveedor', sql.VarChar(10), 'P00443')
            .input('CveProv', sql.VarChar(10), 'P00443')
            .input('Telefonos', sql.VarChar(100), '1234567890');

        const result = await request.execute('spDatosProveedor');
        console.log('Result:', JSON.stringify(result, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testUpdate();
