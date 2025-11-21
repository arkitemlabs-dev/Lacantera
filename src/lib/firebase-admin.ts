import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin solo una vez
if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    
    console.log('🔍 Verificando credenciales Firebase Admin:');
    console.log('- Project ID:', projectId ? '✅' : '❌');
    console.log('- Client Email:', clientEmail ? '✅' : '❌');
    console.log('- Private Key:', privateKey ? '✅' : '❌');
    
    if (projectId && clientEmail && privateKey) {
      console.log('🔑 Inicializando Firebase Admin con credenciales completas');
      
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        projectId
      });
      
      console.log('✅ Firebase Admin inicializado correctamente');
    } else {
      console.log('⚠️ Credenciales incompletas, usando configuración básica');
      initializeApp({
        projectId: 'portal-proveedores-web'
      });
    }
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Exportar servicios con manejo de errores
let adminAuth: any = null;
let adminDb: any = null;

try {
  adminAuth = getAuth();
  adminDb = getFirestore();
  console.log('✅ Firebase Admin services initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin services:', error);
}

export { adminAuth, adminDb };