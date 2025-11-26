/**
 * Script para analizar la estructura de tablas y proponer arquitectura
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

async function analyzeStructure() {
  console.log('🔍 ANÁLISIS DE ESTRUCTURA DE BASE DE DATOS\n');

  try {
    const pool = await sql.connect(config);

    // 1. Tabla Prov
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLA: Prov (Proveedores)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const provStats = await pool.request().query(`
      SELECT
        COUNT(*) as Total,
        COUNT(RFC) as ConRFC,
        COUNT(CASE WHEN Estatus = 'ALTA' THEN 1 END) as Activos
      FROM Prov
    `);

    console.log(`   Total proveedores: ${provStats.recordset[0].Total}`);
    console.log(`   Con RFC: ${provStats.recordset[0].ConRFC}`);
    console.log(`   Con estatus ALTA: ${provStats.recordset[0].Activos}\n`);

    // Campos clave de Prov
    const provFields = await pool.request().query(`
      SELECT TOP 20 COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prov'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Primeros 20 campos:\n');
    provFields.recordset.forEach(col => {
      console.log(`   ${col.COLUMN_NAME.padEnd(30, ' ')} ${col.DATA_TYPE}`);
    });

    // 2. Tabla pNetUsuario
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TABLA: pNetUsuario (Usuarios Portal)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const pNetUserStats = await pool.request().query(`
      SELECT
        COUNT(*) as Total,
        COUNT(CASE WHEN Estatus = 'ACTIVO' THEN 1 END) as Activos
      FROM pNetUsuario
    `);

    console.log(`   Total usuarios: ${pNetUserStats.recordset[0].Total}`);
    console.log(`   Activos: ${pNetUserStats.recordset[0].Activos}\n`);

    // 3. Tipos de usuario
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 TIPOS DE USUARIO (pNetUsuarioTipo)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const userTypes = await pool.request().query(`
      SELECT
        IDUsuarioTipo,
        Descripcion,
        Tabla,
        Campo,
        Estatus
      FROM pNetUsuarioTipo
      ORDER BY IDUsuarioTipo
    `);

    userTypes.recordset.forEach(type => {
      const status = type.Estatus ? '✅' : '❌';
      console.log(`   ${status} ID: ${type.IDUsuarioTipo} | ${type.Descripcion.padEnd(35, ' ')} | Tabla: ${type.Tabla.padEnd(15, ' ')} | Campo: ${type.Campo}`);
    });

    // 4. Usuarios existentes por tipo
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📊 DISTRIBUCIÓN DE USUARIOS POR TIPO');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const userDist = await pool.request().query(`
      SELECT
        t.IDUsuarioTipo,
        t.Descripcion,
        t.Tabla,
        COUNT(u.IDUsuario) as CantidadUsuarios
      FROM pNetUsuarioTipo t
      LEFT JOIN pNetUsuario u ON t.IDUsuarioTipo = u.IDUsuarioTipo
      GROUP BY t.IDUsuarioTipo, t.Descripcion, t.Tabla
      ORDER BY CantidadUsuarios DESC
    `);

    userDist.recordset.forEach(dist => {
      console.log(`   ${dist.Descripcion.padEnd(35, ' ')} | ${dist.Tabla.padEnd(15, ' ')} | ${dist.CantidadUsuarios} usuarios`);
    });

    // 5. Empresas
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('🏢 EMPRESAS (Empresa)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const empresas = await pool.request().query(`
      SELECT TOP 10 Empresa, Nombre
      FROM Empresa
      ORDER BY Empresa
    `);

    if (empresas.recordset.length > 0) {
      console.log('Primeras 10 empresas:\n');
      empresas.recordset.forEach(emp => {
        console.log(`   ${emp.Empresa.padEnd(10, ' ')} | ${emp.Nombre}`);
      });
    }

    // 6. Propuesta de arquitectura
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('💡 ARQUITECTURA PROPUESTA');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📋 MODELO DE DATOS:\n');
    console.log('1. USUARIOS DEL SISTEMA:');
    console.log('   Tabla: pNetUsuario');
    console.log('   - IDUsuario (PK)');
    console.log('   - Usuario (FK a Usuario.Usuario o Prov.Proveedor)');
    console.log('   - IDUsuarioTipo (FK a pNetUsuarioTipo)');
    console.log('   - eMail (para login)');
    console.log('   - Password (hash)');
    console.log('   - Estatus\n');

    console.log('2. TIPOS DE USUARIO:');
    console.log('   Tabla: pNetUsuarioTipo');
    console.log('   a) Proveedores → Tabla: Prov, Campo: Proveedor');
    console.log('   b) Personal La Cantera → Tabla: Usuario, Campo: Usuario');
    console.log('   c) Clientes (opcional) → Tabla: Cte, Campo: Cliente\n');

    console.log('3. PROVEEDORES (Datos completos):');
    console.log('   Tabla: Prov');
    console.log('   - Proveedor (PK)');
    console.log('   - RFC, RazonSocial, Nombre');
    console.log('   - Dirección, Contacto');
    console.log('   - Estatus\n');

    console.log('4. RELACIÓN USUARIO-EMPRESA:');
    console.log('   Tabla: pNetUsuarioEmpresa');
    console.log('   - IDUsuarioEmpresa (PK)');
    console.log('   - IDUsuario (FK a pNetUsuario)');
    console.log('   - Empresa (FK a Empresa)\n');

    console.log('5. DOCUMENTOS DE PROVEEDORES:');
    console.log('   Opciones:');
    console.log('   a) Usar tablas web: wProvAnexarCFDI, wProvDocPendAnexo');
    console.log('   b) Crear nueva tabla: ProveedorDocumentos\n');

    console.log('6. ÓRDENES DE COMPRA:');
    console.log('   Tabla existente: Compra');
    console.log('   Tabla web: wProvOrdCompra (para consulta web)\n');

    console.log('7. FACTURAS:');
    console.log('   Tabla existente: CFDI o DocumentacionXML');
    console.log('   Tabla web: wProvAnexarCFDI\n');

    await pool.close();

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    if (err.originalError) {
      console.error('   Detalles:', err.originalError.message);
    }
    process.exit(1);
  }
}

analyzeStructure();
