/**
 * Script para probar el endpoint de registro de proveedores
 */

const testData = {
  email: 'nuevo.proveedor@example.com',
  password: 'Password123!',
  nombre: 'Juan Pérez',
  rfc: 'XAXX010101000',
  razonSocial: 'Proveedor Nuevo SA de CV',
};

console.log('🧪 PROBANDO ENDPOINT DE REGISTRO\n');
console.log('Datos de prueba:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n');

// Nota: Este script requiere que el servidor Next.js esté corriendo
// Para probarlo manualmente, usa:
// curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"nuevo.proveedor@example.com","password":"Password123!","nombre":"Juan Pérez","rfc":"XAXX010101000","razonSocial":"Proveedor Nuevo SA de CV"}'

console.log('Para probar el endpoint, ejecuta:');
console.log('\n1. Inicia el servidor: npm run dev');
console.log('\n2. En otra terminal, ejecuta:');
console.log('\ncurl -X POST http://localhost:3000/api/auth/register \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -d '${JSON.stringify(testData)}'`);
console.log('\n');
