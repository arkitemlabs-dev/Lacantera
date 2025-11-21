// Script para asignar usuarios a Arkitem
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

async function assignUsersToArkitem() {
  try {
    console.log('🔍 Buscando empresa Arkitem...');
    
    // Buscar Arkitem
    const empresasSnapshot = await db
      .collection('empresas')
      .where('codigo', '==', 'ARKITEM')
      .get();
    
    if (empresasSnapshot.empty) {
      console.log('❌ No se encontró empresa Arkitem');
      return;
    }
    
    const arkitemId = empresasSnapshot.docs[0].id;
    console.log('✅ Arkitem encontrada:', arkitemId);
    
    // Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    
    console.log('👥 Asignando usuarios a Arkitem...');
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Determinar rol
      let rol = 'proveedor';
      if (userData.role === 'admin_super' || userData.role === 'admin_compras') {
        rol = userData.role;
      }
      
      // Verificar si ya está asignado
      const existingAssignment = await db
        .collection('usuarioEmpresas')
        .where('usuarioId', '==', userId)
        .where('empresaId', '==', arkitemId)
        .get();
      
      if (existingAssignment.empty) {
        await db.collection('usuarioEmpresas').add({
          usuarioId: userId,
          empresaId: arkitemId,
          rol: rol,
          activo: true,
          fechaAsignacion: new Date().toISOString()
        });
        
        console.log(`✅ Usuario ${userData.email} asignado a Arkitem con rol ${rol}`);
      } else {
        console.log(`⚠️ Usuario ${userData.email} ya está asignado a Arkitem`);
      }
    }
    
    console.log('🎉 Asignación completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

assignUsersToArkitem().then(() => {
  console.log('✅ Script completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});