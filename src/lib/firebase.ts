import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDjOPRuY4FoZxnYTSlrZWxDRctLWQfzlQY",
  authDomain: "portal-proveedores-web.firebaseapp.com",
  projectId: "portal-proveedores-web",
  storageBucket: "portal-proveedores-web.firebasestorage.app",
  messagingSenderId: "312186975530",
  appId: "1:312186975530:web:5261ece658697686585a53",
  measurementId: "G-FGV233ZTN8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Solo conectar Storage al emulador en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  try {
    // Solo Storage usa emulador, Auth y Firestore usan producción
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log("🔧 Storage Emulator conectado");
  } catch (error) {
    console.log("⚠️ Storage Emulator ya conectado");
  }
}

export { app, auth, db, storage };
