
import dotenv from 'dotenv';
import { hybridDB, getAllTenants } from '../src/lib/database/multi-tenant-connection';
import sql from 'mssql';

dotenv.config({ path: '.env.local' });

async function testConnections() {
    console.log('Testing connectivity...');
    console.log('MSSQL_SERVER:', process.env.MSSQL_SERVER);
    console.log('MSSQL_ERP_SERVER:', process.env.MSSQL_ERP_SERVER);

    try {
        // 1. Test Portal Connection
        console.log('\n--- Testing Portal Connection ---');
        try {
            const portalPool = await hybridDB.getPortalConnection();
            console.log('✅ Portal connection successful');
            await portalPool.close();
        } catch (e: any) {
            console.error('❌ Portal connection failed:', e.message);
        }

        // 2. Test ERP Connections
        console.log('\n--- Testing ERP Connections ---');
        const tenants = getAllTenants();

        for (const tenant of tenants) {
            console.log(`\nTesting tenant: ${tenant.id} (${tenant.nombre})`);
            console.log(`Database: ${tenant.erpDatabase}, Company Code: ${tenant.codigoEmpresa}`);

            try {
                const pool = await hybridDB.getERPConnection(tenant.id);
                const result = await pool.request().query('SELECT DB_NAME() as dbName');
                console.log(`✅ Connection successful. Connected to: ${result.recordset[0].dbName}`);

                // Optional: Check if SP exists
                try {
                    const spCheck = await pool.request().query(`
                SELECT name 
                FROM sys.procedures 
                WHERE name = 'spDatosProveedor'
            `);
                    if (spCheck.recordset.length > 0) {
                        console.log('✅ spDatosProveedor exists');
                    } else {
                        console.warn('⚠️ spDatosProveedor NOT FOUND in this database');
                    }
                } catch (e: any) {
                    console.warn('⚠️ Could not verify SP existence:', e.message);
                }

            } catch (error: any) {
                console.error(`❌ Connection failed for ${tenant.id}:`, error.message);
            }
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await hybridDB.closeAllConnections();
        process.exit(0);
    }
}

testConnections();
