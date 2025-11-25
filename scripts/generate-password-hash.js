/**
 * Script para generar hash de contraseña con bcrypt
 *
 * Uso:
 *   node scripts/generate-password-hash.js <contraseña>
 *
 * Ejemplo:
 *   node scripts/generate-password-hash.js admin123
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Debes proporcionar una contraseña');
  console.log('\nUso:');
  console.log('  node scripts/generate-password-hash.js <contraseña>');
  console.log('\nEjemplo:');
  console.log('  node scripts/generate-password-hash.js admin123');
  process.exit(1);
}

console.log('🔐 Generando hash de contraseña...\n');

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error al generar hash:', err);
    process.exit(1);
  }

  console.log('✅ Hash generado exitosamente:\n');
  console.log(hash);
  console.log('\n📋 Para usar en SQL Server:');
  console.log(`\nINSERT INTO users (email, password_hash, display_name, role, user_type, is_active)`);
  console.log(`VALUES (`);
  console.log(`  'usuario@example.com',`);
  console.log(`  '${hash}',`);
  console.log(`  'Nombre Usuario',`);
  console.log(`  'admin_super',`);
  console.log(`  'Administrador',`);
  console.log(`  1`);
  console.log(`);\n`);
});
