/**
 * Script para insertar empresas de prueba en la tabla Empresa
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
  },
};

async function insertTestEmpresas() {
  console.log('🏢 INSERTANDO EMPRESAS DE PRUEBA\n');

  try {
    const pool = await sql.connect(config);
    console.log('✅ Conectado a SQL Server\n');

    // Verificar empresas existentes
    const existingEmpresas = await pool.request().query(`
      SELECT Empresa, Nombre
      FROM Empresa
      ORDER BY Empresa
    `);

    console.log('📋 Empresas existentes en la base de datos:');
    existingEmpresas.recordset.forEach((e) => {
      console.log(`   - ${e.Empresa}: ${e.Nombre}`);
    });
    console.log('');

    // Verificar si LCDM ya existe
    const lcdmExists = await pool.request().query(`
      SELECT COUNT(*) as count FROM Empresa WHERE Empresa = 'LCDM'
    `);

    if (lcdmExists.recordset[0].count === 0) {
      console.log('➕ Insertando: La Cantera Desarrollos Mineros (LCDM)');
      await pool.request().query(`
        INSERT INTO Empresa (
          Empresa,
          Nombre,
          RFC,
          Direccion,
          Telefonos,
          Estatus
        ) VALUES (
          'LCDM',
          'La Cantera Desarrollos Mineros S.A. de C.V.',
          'LCD010101A00',
          'Av. Minera 123, Col. Industrial',
          '555-1234-5678',
          'ALTA'
        )
      `);
      console.log('   ✅ LCDM insertada\n');
    } else {
      console.log('⚠️  LCDM ya existe, omitiendo...\n');
    }

    // Verificar si ARKT ya existe
    const arktExists = await pool.request().query(`
      SELECT COUNT(*) as count FROM Empresa WHERE Empresa = 'ARKT'
    `);

    if (arktExists.recordset[0].count === 0) {
      console.log('➕ Insertando: Arkitem (ARKT)');
      await pool.request().query(`
        INSERT INTO Empresa (
          Empresa,
          Nombre,
          RFC,
          Direccion,
          Telefonos,
          Estatus
        ) VALUES (
          'ARKT',
          'Arkitem S.A. de C.V.',
          'ARK020202B00',
          'Av. Tecnología 456, Col. Empresarial',
          '555-8765-4321',
          'ALTA'
        )
      `);
      console.log('   ✅ ARKT insertada\n');
    } else {
      console.log('⚠️  ARKT ya existe, omitiendo...\n');
    }

    // Mostrar empresas finales
    const finalEmpresas = await pool.request().query(`
      SELECT Empresa, Nombre, RFC, Direccion, Telefonos
      FROM Empresa
      ORDER BY Empresa
    `);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 EMPRESAS EN LA BASE DE DATOS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    finalEmpresas.recordset.forEach((e, index) => {
      console.log(`${index + 1}. ${e.Empresa} - ${e.Nombre}`);
      console.log(`   RFC: ${e.RFC || 'N/A'}`);
      console.log(`   Dirección: ${e.Direccion || 'N/A'}`);
      console.log(`   Teléfono: ${e.Telefonos || 'N/A'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO');
    console.log('═══════════════════════════════════════════════════════════════');

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

insertTestEmpresas();
