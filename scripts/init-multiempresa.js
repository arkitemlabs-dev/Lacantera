// Script para inicializar datos de multiempresa
// Ejecutar con: node scripts/init-multiempresa.js

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function initMultiempresa() {
  try {
    console.log('🚀 Inicializando estructura multiempresa...');

    // 1. Crear empresas de ejemplo
    const empresas = [
      {
        codigo: 'LCDM',
        razonSocial: 'La Cantera Desarrollos Mineros S.A.S.',
        nombreComercial: 'La Cantera',
        activa: true,
        fechaCreacion: new Date().toISOString()
      },
      {
        codigo: 'ARKITEM',
        razonSocial: 'Arkitem Technologies S.A.S.',
        nombreComercial: 'Arkitem',
        activa: true,
        fechaCreacion: new Date().toISOString()
      }
    ];

    console.log('📊 Creando empresas...');
    const empresaIds = {};
    
    for (const empresa of empresas) {
      const docRef = await db.collection('empresas').add(empresa);
      empresaIds[empresa.codigo] = docRef.id;
      console.log(`✅ Empresa creada: ${empresa.nombreComercial} (ID: ${docRef.id})`);
    }

    // 2. Obtener usuarios existentes y asignarlos a empresas
    console.log('👥 Obteniendo usuarios existentes...');
    const usersSnapshot = await db.collection('users').get();
    
    if (!usersSnapshot.empty) {
      console.log('🔗 Asignando usuarios a empresas...');
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Asignar todos los usuarios a La Cantera por defecto
        const empresaId = empresaIds['LCDM'];
        
        // Determinar rol basado en el rol actual
        let rol = 'proveedor';
        if (userData.role === 'admin_super' || userData.role === 'admin_compras') {
          rol = userData.role;
        }
        
        await db.collection('usuarioEmpresas').add({
          usuarioId: userId,
          empresaId: empresaId,
          rol: rol,
          activo: true,
          fechaAsignacion: new Date().toISOString()
        });
        
        console.log(`✅ Usuario ${userData.email} asignado a La Cantera con rol ${rol}`);
      }
    }

    // 3. Actualizar documentos existentes con empresaId
    console.log('📝 Actualizando documentos existentes...');
    
    const collections = ['proveedores', 'invoices', 'purchaseOrders', 'payments'];
    const empresaLaCantera = empresaIds['LCDM'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        let count = 0;
        
        snapshot.docs.forEach(doc => {
          if (!doc.data().empresaId) {
            batch.update(doc.ref, { empresaId: empresaLaCantera });
            count++;
          }
        });
        
        if (count > 0) {
          await batch.commit();
          console.log(`✅ Actualizados ${count} documentos en ${collectionName}`);
        }
      }
    }

    console.log('🎉 Inicialización multiempresa completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`- Empresas creadas: ${Object.keys(empresaIds).length}`);
    console.log(`- Usuarios procesados: ${usersSnapshot.size}`);
    console.log('\n🔧 Próximos pasos:');
    console.log('1. Actualizar las reglas de Firestore');
    console.log('2. Probar el login con selección de empresa');
    console.log('3. Verificar que los datos se filtren correctamente');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  initMultiempresa().then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { initMultiempresa };