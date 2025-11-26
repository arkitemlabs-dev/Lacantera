/**
 * Script para crear usuarios de prueba en las tablas pNet
 * Ejecutar con: node scripts/create-test-users.js
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
  console.log('🚀 CREANDO USUARIOS DE PRUEBA\n');

  let pool;

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // ========================================
    // 1. CREAR PROVEEDOR DE PRUEBA
    // ========================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('1️⃣  CREANDO PROVEEDOR DE PRUEBA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const proveedorClave = 'PROV001';

    // Verificar si ya existe
    const existeProv = await pool.request()
      .input('proveedor', sql.VarChar(10), proveedorClave)
      .query('SELECT Proveedor FROM Prov WHERE Proveedor = @proveedor');

    if (existeProv.recordset.length === 0) {
      // Crear proveedor
      await pool.request()
        .input('proveedor', sql.VarChar(10), proveedorClave)
        .input('nombre', sql.VarChar(100), 'Proveedor Prueba SA de CV')
        .input('rfc', sql.VarChar(15), 'PPR010101ABC')
        .input('direccion', sql.VarChar(100), 'Calle Prueba 123')
        .input('colonia', sql.VarChar(100), 'Centro')
        .input('poblacion', sql.VarChar(100), 'Ciudad de México')
        .input('estado', sql.VarChar(30), 'CDMX')
        .input('codigoPostal', sql.VarChar(15), '01000')
        .input('estatus', sql.VarChar(15), 'ALTA')
        .query(`
          INSERT INTO Prov (
            Proveedor, Nombre, RFC, Direccion, Colonia,
            Poblacion, Estado, CodigoPostal, Estatus
          )
          VALUES (
            @proveedor, @nombre, @rfc, @direccion, @colonia,
            @poblacion, @estado, @codigoPostal, @estatus
          )
        `);

      console.log(`✅ Proveedor creado: ${proveedorClave}`);
    } else {
      console.log(`⚠️  Proveedor ${proveedorClave} ya existe`);
    }

    // ========================================
    // 2. CREAR USUARIO EN pNetUsuario
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('2️⃣  CREANDO USUARIO DE PORTAL PARA EL PROVEEDOR');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const email = 'proveedor@test.com';
    const password = 'Test123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Verificar si ya existe el usuario
    const existeUser = await pool.request()
      .input('email', sql.VarChar(50), email)
      .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

    let idUsuario;

    if (existeUser.recordset.length === 0) {
      // Crear usuario
      const result = await pool.request()
        .input('usuario', sql.VarChar(10), proveedorClave)
        .input('idUsuarioTipo', sql.Int, 4) // Tipo 4 = Proveedor
        .input('email', sql.VarChar(50), email)
        .input('nombre', sql.VarChar(100), 'Usuario Proveedor Prueba')
        .input('estatus', sql.VarChar(15), 'ACTIVO')
        .input('primeraVez', sql.Bit, 1)
        .query(`
          INSERT INTO pNetUsuario (
            Usuario, IDUsuarioTipo, eMail, Nombre,
            Estatus, FechaRegistro, PrimeraVez
          )
          OUTPUT INSERTED.IDUsuario
          VALUES (
            @usuario, @idUsuarioTipo, @email, @nombre,
            @estatus, GETDATE(), @primeraVez
          )
        `);

      idUsuario = result.recordset[0].IDUsuario;
      console.log(`✅ Usuario creado: ${email}`);
      console.log(`   ID: ${idUsuario}`);
      console.log(`   Tipo: Proveedor (4)`);
      console.log(`   Relacionado con: ${proveedorClave}`);
    } else {
      idUsuario = existeUser.recordset[0].IDUsuario;
      console.log(`⚠️  Usuario ${email} ya existe (ID: ${idUsuario})`);
    }

    // ========================================
    // 3. CREAR USUARIO ADMIN DE LA CANTERA
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('3️⃣  CREANDO USUARIO ADMIN LA CANTERA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const adminEmail = 'admin@lacantera.com';
    const adminPassword = 'Admin123!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    // Primero crear usuario en tabla Usuario (si no existe)
    const usuarioAdmin = 'ADMIN01';

    const existeUsuario = await pool.request()
      .input('usuario', sql.VarChar(10), usuarioAdmin)
      .query('SELECT Usuario FROM Usuario WHERE Usuario = @usuario');

    if (existeUsuario.recordset.length === 0) {
      await pool.request()
        .input('usuario', sql.VarChar(10), usuarioAdmin)
        .input('nombre', sql.VarChar(100), 'Administrador La Cantera')
        .input('contrasena', sql.VarChar(32), adminPasswordHash.substring(0, 32))
        .input('estatus', sql.VarChar(15), 'ALTA')
        .query(`
          INSERT INTO Usuario (Usuario, Nombre, Contrasena, Estatus)
          VALUES (@usuario, @nombre, @contrasena, @estatus)
        `);

      console.log(`✅ Usuario ERP creado: ${usuarioAdmin}`);
    } else {
      console.log(`⚠️  Usuario ERP ${usuarioAdmin} ya existe`);
    }

    // Crear usuario en pNetUsuario
    const existeAdmin = await pool.request()
      .input('email', sql.VarChar(50), adminEmail)
      .query('SELECT IDUsuario FROM pNetUsuario WHERE eMail = @email');

    if (existeAdmin.recordset.length === 0) {
      const resultAdmin = await pool.request()
        .input('usuario', sql.VarChar(10), usuarioAdmin)
        .input('idUsuarioTipo', sql.Int, 1) // Tipo 1 = Intelisis (admin)
        .input('email', sql.VarChar(50), adminEmail)
        .input('nombre', sql.VarChar(100), 'Administrador La Cantera')
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

      console.log(`✅ Usuario portal creado: ${adminEmail}`);
      console.log(`   ID: ${resultAdmin.recordset[0].IDUsuario}`);
      console.log(`   Tipo: Intelisis/Admin (1)`);
    } else {
      console.log(`⚠️  Usuario ${adminEmail} ya existe`);
    }

    // ========================================
    // 4. VERIFICAR USUARIOS CREADOS
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('4️⃣  VERIFICANDO USUARIOS CREADOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const usuarios = await pool.request().query(`
      SELECT
        u.IDUsuario,
        u.Usuario,
        u.eMail,
        u.Nombre,
        u.Estatus,
        t.Descripcion as TipoUsuario,
        t.Tabla,
        CASE
          WHEN t.Tabla = 'Prov' THEN p.Nombre
          WHEN t.Tabla = 'Usuario' THEN usr.Nombre
          ELSE NULL
        END as NombreRelacionado
      FROM pNetUsuario u
      INNER JOIN pNetUsuarioTipo t ON u.IDUsuarioTipo = t.IDUsuarioTipo
      LEFT JOIN Prov p ON u.Usuario = p.Proveedor AND t.Tabla = 'Prov'
      LEFT JOIN Usuario usr ON u.Usuario = usr.Usuario AND t.Tabla = 'Usuario'
      ORDER BY u.IDUsuario
    `);

    console.log('Usuarios en el sistema:\n');
    usuarios.recordset.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.eMail.padEnd(30, ' ')} | ${user.TipoUsuario.padEnd(15, ' ')} | ${user.Estatus}`);
      console.log(`   Usuario: ${user.Usuario} | Nombre: ${user.Nombre}`);
      if (user.NombreRelacionado) {
        console.log(`   → Relacionado con: ${user.NombreRelacionado}`);
      }
      console.log('');
    });

    // ========================================
    // 5. CREDENCIALES DE PRUEBA
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔑 CREDENCIALES DE PRUEBA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('PROVEEDOR:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');

    console.log('ADMINISTRADOR:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ USUARIOS DE PRUEBA CREADOS EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    await pool.close();

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    console.error('\n   Stack:', err.stack);
    process.exit(1);
  }
}

// Ejecutar
createTestUsers()
  .then(() => {
    console.log('✅ Script completado\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
