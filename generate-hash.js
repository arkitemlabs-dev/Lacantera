// Generar hash bcrypt correcto
const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123456';
  const saltRounds = 10;

  console.log('='.repeat(80));
  console.log('GENERANDO HASH BCRYPT');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Contraseña: ${password}`);
  console.log(`Salt rounds: ${saltRounds}`);
  console.log('');
  console.log('Generando hash...');
  console.log('');

  const hash = await bcrypt.hash(password, saltRounds);

  console.log('✅ Hash generado exitosamente:');
  console.log('');
  console.log(hash);
  console.log('');

  // Verificar que funciona
  console.log('Verificando hash...');
  const isValid = await bcrypt.compare(password, hash);

  if (isValid) {
    console.log('✅ Hash verificado correctamente');
  } else {
    console.log('❌ Error: Hash no válido');
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('SQL PARA ACTUALIZAR:');
  console.log('='.repeat(80));
  console.log('');
  console.log(`UPDATE WebUsuario`);
  console.log(`SET Contrasena = '${hash}'`);
  console.log(`WHERE eMail = 'admin@lacantera.com';`);
  console.log('');
  console.log('='.repeat(80));
}

generateHash();
