
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const erpConfig = {
  user: process.env.MSSQL_ERP_USER,
  password: process.env.MSSQL_ERP_PASSWORD,
  server: process.env.MSSQL_ERP_SERVER,
  database: 'Cantera_Ajustes', 
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkERPProviders() {
    try {
        console.log(`Conectando a ERP en ${erpConfig.server} db ${erpConfig.database}...`);
        const pool = await sql.connect(erpConfig);
        
        console.log('--- Buscando Proveedores en Prov ---');
        const result = await pool.request().query(`
            SELECT TOP 20 Proveedor, Nombre, RFC, Estatus 
            FROM Prov 
            WHERE Nombre LIKE '%Luis%' OR Nombre LIKE '%Montero%' OR Proveedor IN ('PROV001', 'PROV002', 'PROV003', 'P00443')
        `);
        console.log(JSON.stringify(result.recordset, null, 2));

        console.log('\n--- Ejecutando sp_getProveedores para Empresa 06 (Cantera-Test) ---');
        try {
            const spResult = await pool.request()
                .input('Empresa', sql.VarChar(10), '06')
                .execute('sp_getProveedores');
            
            const records = spResult.recordsets[0];
            console.log(`SP retornó ${records.length} registros para Empresa 06`);
            
            const luis = records.find(p => (p.Nombre || p.ProveedorNombre || '').includes('Luis') || (p.Nombre || p.ProveedorNombre || '').includes('Montero'));
            if (luis) {
                console.log('¡Encontrado Luis Montero en el SP!', JSON.stringify(luis, null, 2));
            } else {
                console.log('Luis Montero no está en los resultados del SP para Empresa 06');
                if (records.length > 0) {
                    console.log('Primer registro retornado por el SP:', JSON.stringify(records[0], null, 2));
                }
            }
        } catch (e) {
            console.error('Error ejecutando SP:', e.message);
        }

        await sql.close();
    } catch (err) {
        console.error('Error de conexión:', err);
    }
}

checkERPProviders();
