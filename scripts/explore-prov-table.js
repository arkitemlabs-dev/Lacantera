/**
 * Script para explorar la tabla Prov (Proveedores)
 */

const sql = require('mssql');

const config = {
  server: 'cloud.arkitem.com',
  database: 'PP',
  user: 'sa_ediaz',
  password: 'YX!Au4DJ{Yuz',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
  },
};

async function exploreProvTable() {
  console.log('🔍 EXPLORANDO TABLA PROV (PROVEEDORES)\n');

  try {
    const pool = await sql.connect(config);

    // Obtener estructura de la tabla Prov
    const columns = await pool.request().query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prov'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 TABLA: Prov (${columns.recordset.length} columnas)`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Campos más relevantes para el portal
    const relevantFields = [
      'Proveedor', 'ProveedorID', 'RFC', 'Nombre', 'RazonSocial',
      'EMail', 'EMailWeb', 'Telefono', 'Direccion', 'Colonia',
      'Poblacion', 'Estado', 'CodigoPostal', 'Pais',
      'Estatus', 'Activo', 'Situacion', 'FechaAlta',
      'Contacto', 'PaginaWeb', 'Observaciones'
    ];

    console.log('📋 CAMPOS CLAVE PARA PORTAL DE PROVEEDORES:\n');

    const relevantColumns = columns.recordset.filter(col =>
      relevantFields.includes(col.COLUMN_NAME)
    );

    relevantColumns.forEach(col => {
      let type = col.DATA_TYPE;
      if (col.CHARACTER_MAXIMUM_LENGTH) {
        type += `(${col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH})`;
      }
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${col.COLUMN_NAME.padEnd(25, ' ')} ${type.padEnd(20, ' ')} ${nullable}`);
    });

    // Obtener un proveedor de ejemplo
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📌 EJEMPLO DE PROVEEDOR:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sample = await pool.request().query(`
      SELECT TOP 1 * FROM Prov
      WHERE Proveedor IS NOT NULL
    `);

    if (sample.recordset.length > 0) {
      const prov = sample.recordset[0];

      relevantFields.forEach(field => {
        if (prov[field] !== undefined) {
          const value = prov[field] !== null ? String(prov[field]).substring(0, 60) : 'NULL';
          console.log(`   ${field.padEnd(25, ' ')} = ${value}`);
        }
      });
    }

    // Verificar si hay proveedores con email
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 ESTADÍSTICAS:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const stats = await pool.request().query(`
      SELECT
        COUNT(*) as Total,
        COUNT(EMail) as ConEmail,
        COUNT(EMailWeb) as ConEmailWeb,
        COUNT(CASE WHEN Estatus = 'ALTA' THEN 1 END) as Activos,
        COUNT(CASE WHEN Activo = 1 THEN 1 END) as ConFlagActivo
      FROM Prov
    `);

    const s = stats.recordset[0];
    console.log(`   Total de proveedores:          ${s.Total}`);
    console.log(`   Con email:                     ${s.ConEmail} (${Math.round(s.ConEmail/s.Total*100)}%)`);
    console.log(`   Con email web:                 ${s.ConEmailWeb} (${Math.round(s.ConEmailWeb/s.Total*100)}%)`);
    console.log(`   Con estatus ALTA:              ${s.Activos}`);
    console.log(`   Con flag Activo:               ${s.ConFlagActivo}`);

    // Buscar relación con pNetUsuario
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 VERIFICAR RELACIÓN CON pNetUsuario:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Ver si pNetUsuarioTipo tiene tipo "Proveedor"
    const userTypes = await pool.request().query(`
      SELECT * FROM pNetUsuarioTipo
    `);

    console.log('Tipos de usuario en pNetUsuarioTipo:\n');
    userTypes.recordset.forEach(type => {
      console.log(`   ID: ${type.IDUsuarioTipo} | ${type.Descripcion.padEnd(30, ' ')} | Tabla: ${type.Tabla.padEnd(15, ' ')} | Campo: ${type.Campo}`);
    });

    // Ver si hay usuarios tipo proveedor
    const provUsers = await pool.request().query(`
      SELECT
        u.IDUsuario,
        u.Usuario,
        u.eMail,
        u.Nombre,
        t.Descripcion as TipoUsuario,
        t.Tabla,
        t.Campo
      FROM pNetUsuario u
      INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
      WHERE t.Tabla = 'Prov' OR t.Descripcion LIKE '%Proveedor%'
    `);

    console.log(`\n\n📊 Usuarios de tipo Proveedor encontrados: ${provUsers.recordset.length}\n`);

    if (provUsers.recordset.length > 0) {
      console.log('Ejemplos:\n');
      provUsers.recordset.slice(0, 5).forEach(user => {
        console.log(`   ID: ${user.IDUsuario} | Usuario: ${user.Usuario} | Email: ${user.eMail}`);
        console.log(`   Nombre: ${user.Nombre}`);
        console.log(`   Tipo: ${user.TipoUsuario} | Tabla: ${user.Tabla} | Campo: ${user.Campo}`);
        console.log('');
      });
    }

    console.log('\n');
    await pool.close();

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    process.exit(1);
  }
}

exploreProvTable();
