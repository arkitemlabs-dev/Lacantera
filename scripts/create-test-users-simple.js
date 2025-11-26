/**
 * Script simplificado para crear usuarios de prueba solo en pNetUsuario
 * Sin tocar la tabla Usuario del ERP
 */

const sql = require('mssql');
const bcrypt = require('bcrypt');

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

async function createTestUsers() {
  console.log('🚀 CREANDO USUARIOS DE PRUEBA (SOLO PORTAL)\n');

  let pool;

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // ========================================
    // USUARIO PROVEEDOR
    // ========================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('1️⃣  USUARIO PROVEEDOR');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const proveedorClave = 'PROV001';
    const emailProv = 'proveedor@test.com';
    const passwordProv = 'Test123!';

    // Verificar proveedor
    const existeProv = await pool.request()
      .input('proveedor', sql.VarChar(10), proveedorClave)
      .query('SELECT Proveedor, Nombre FROM Prov WHERE Proveedor = @proveedor');

    if (existeProv.recordset.length > 0) {
      console.log(`✅ Proveedor encontrado: ${existeProv.recordset[0].Proveedor}`);
      console.log(`   Nombre: ${existeProv.recordset[0].Nombre}`);
    } else {
      console.log(`❌ Proveedor ${proveedorClave} no encontrado`);
      console.log('   Creándolo...');

      await pool.request()
        .input('proveedor', sql.VarChar(10), proveedorClave)
        .input('nombre', sql.VarChar(100), 'Proveedor Prueba SA de CV')
        .input('rfc', sql.VarChar(15), 'PPR010101ABC')
        .input('estatus', sql.VarChar(15), 'ALTA')
        .query(`
          INSERT INTO Prov (Proveedor, Nombre, RFC, Estatus)
          VALUES (@proveedor, @nombre, @rfc, @estatus)
        `);

      console.log(`✅ Proveedor creado: ${proveedorClave}`);
    }

    // Crear usuario portal
    const existeUserProv = await pool.request()
      .input('email', sql.VarChar(50), emailProv)
      .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

    if (existeUserProv.recordset.length === 0) {
      const result = await pool.request()
        .input('usuario', sql.VarChar(10), proveedorClave)
        .input('idUsuarioTipo', sql.Int, 4) // Tipo 4 = Proveedor
        .input('email', sql.VarChar(50), emailProv)
        .input('nombre', sql.VarChar(100), 'Usuario Proveedor Prueba')
        .input('estatus', sql.VarChar(15), 'ACTIVO')
        .query(`
          INSERT INTO pNetUsuario (
            Usuario, IDUsuarioTipo, eMail, Nombre,
            Estatus, FechaRegistro, PrimeraVez
          )
          OUTPUT INSERTED.IDUsuario
          VALUES (
            @usuario, @idUsuarioTipo, @email, @nombre,
            @estatus, GETDATE(), 1
          )
        `);

      console.log(`\n✅ Usuario portal creado:`);
      console.log(`   Email: ${emailProv}`);
      console.log(`   Password: ${passwordProv}`);
      console.log(`   ID: ${result.recordset[0].IDUsuario}`);
      console.log(`   Tipo: Proveedor (4)`);
    } else {
      console.log(`\n⚠️  Usuario ${emailProv} ya existe (ID: ${existeUserProv.recordset[0].IDUsuario})`);
    }

    // ========================================
    // USUARIO ADMIN (usando usuario existente)
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('2️⃣  USUARIO ADMINISTRADOR');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const adminEmail = 'admin@lacantera.com';
    const adminPassword = 'Admin123!';

    // Buscar un usuario existente en la tabla Usuario
    const usuariosExistentes = await pool.request()
      .query('SELECT TOP 1 Usuario, Nombre FROM Usuario WHERE Estatus = \'ALTA\'');

    if (usuariosExistentes.recordset.length > 0) {
      const usuarioERP = usuariosExistentes.recordset[0];
      console.log(`✅ Usuario ERP encontrado: ${usuarioERP.Usuario}`);
      console.log(`   Nombre: ${usuarioERP.Nombre || 'Sin nombre'}`);

      // Crear usuario portal
      const existeAdmin = await pool.request()
        .input('email', sql.VarChar(50), adminEmail)
        .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

      if (existeAdmin.recordset.length === 0) {
        const resultAdmin = await pool.request()
          .input('usuario', sql.VarChar(10), usuarioERP.Usuario)
          .input('idUsuarioTipo', sql.Int, 1) // Tipo 1 = Intelisis
          .input('email', sql.VarChar(50), adminEmail)
          .input('nombre', sql.VarChar(100), usuarioERP.Nombre || 'Administrador')
          .input('estatus', sql.VarChar(15), 'ACTIVO')
          .query(`
            INSERT INTO pNetUsuario (
              Usuario, IDUsuarioTipo, eMail, Nombre,
              Estatus, FechaRegistro, PrimeraVez
            )
            OUTPUT INSERTED.IDUsuario
            VALUES (
              @usuario, @idUsuarioTipo, @email, @nombre,
              @estatus, GETDATE(), 0
            )
          `);

        console.log(`\n✅ Usuario portal creado:`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`   ID: ${resultAdmin.recordset[0].IDUsuario}`);
        console.log(`   Tipo: Intelisis/Admin (1)`);
      } else {
        console.log(`\n⚠️  Usuario ${adminEmail} ya existe`);
      }
    } else {
      console.log('⚠️  No se encontraron usuarios en la tabla Usuario');
      console.log('   Saltando creación de admin...');
    }

    // ========================================
    // RESUMEN
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TODOS LOS USUARIOS EN pNetUsuario');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const usuarios = await pool.request().query(`
      SELECT
        u.IDUsuario,
        u.Usuario,
        u.eMail,
        u.Nombre,
        u.Estatus,
        u.FechaRegistro,
        t.Descripcion as TipoUsuario
      FROM pNetUsuario u
      INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
      ORDER BY u.IDUsuario
    `);

    usuarios.recordset.forEach((user, idx) => {
      const fecha = new Date(user.FechaRegistro).toLocaleDateString('es-MX');
      console.log(`${idx + 1}. ${user.eMail.padEnd(30, ' ')} | ${user.TipoUsuario.padEnd(15, ' ')} | ${user.Estatus}`);
      console.log(`   ID: ${user.IDUsuario} | Usuario: ${user.Usuario} | Registro: ${fecha}`);
      console.log('');
    });

    // ========================================
    // CREDENCIALES
    // ========================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔑 CREDENCIALES DE PRUEBA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('PROVEEDOR:');
    console.log(`   Email:    ${emailProv}`);
    console.log(`   Password: ${passwordProv}`);
    console.log('');

    console.log('ADMINISTRADOR:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

    console.log('NOTA: Las contraseñas aún no están guardadas en la BD.');
    console.log('      Necesitas implementar el sistema de autenticación.');
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.close();

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    process.exit(1);
  }
}

// Ejecutar
createTestUsers()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
