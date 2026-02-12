
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const portalConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkUsers() {
    try {
        const pool = await sql.connect(portalConfig);
        
        console.log('--- pNetUsuario (IDUsuarioTipo = 4) ---');
        const legacy = await pool.request().query("SELECT IDUsuario, eMail, Nombre, Estatus, Usuario FROM pNetUsuario WHERE IDUsuarioTipo = 4");
        console.log(JSON.stringify(legacy.recordset, null, 2));

        console.log('\n--- WebUsuario (Rol = proveedor) ---');
        const modern = await pool.request().query("SELECT UsuarioWeb, eMail, Nombre, Rol, Estatus FROM WebUsuario WHERE Rol = 'proveedor'");
        console.log(JSON.stringify(modern.recordset, null, 2));

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
