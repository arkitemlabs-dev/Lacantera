
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
//const analytics = getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
