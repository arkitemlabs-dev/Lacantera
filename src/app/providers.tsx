'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialRoles, type Role } from '@/lib/roles';
import { ThemeProvider } from '@/components/theme-provider';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type AuthContextType = {
  user: User | null;
  userRole: Role;
  firebaseRole: string | null; // Rol de Firebase (proveedor, admin_super, admin_compras)
  userType: string | null; // Tipo de usuario (Proveedor, Administrador)
  setUserRole: React.Dispatch<React.SetStateAction<Role>>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseRole, setFirebaseRole] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role>(
    initialRoles.find((r) => r.name === 'Super Admin')!
  );
  const [loading, setLoading] = useState(true);

  // Obtener rol desde Firestore cuando el usuario cambia
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Obtener datos del usuario desde Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firestoreRole = userData.role; // proveedor, admin_super, admin_compras
            const firestoreUserType = userData.userType; // Proveedor, Administrador
            
            console.log('📋 Usuario autenticado:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: firestoreRole,
              userType: firestoreUserType
            });

            setFirebaseRole(firestoreRole);
            setUserType(firestoreUserType);

            // Mapear rol de Firebase a rol de UI
            let mappedRole: Role | undefined;
            
            if (firestoreRole === 'proveedor') {
              mappedRole = initialRoles.find(r => r.name === 'Proveedor');
            } else if (firestoreRole === 'admin_super') {
              mappedRole = initialRoles.find(r => r.name === 'Super Admin');
            } else if (firestoreRole === 'admin_compras') {
              mappedRole = initialRoles.find(r => r.name === 'Compras');
            }

            if (mappedRole) {
              setUserRole(mappedRole);
              // Guardar en sessionStorage para persistencia
              try {
                sessionStorage.setItem('userRole', mappedRole.name);
                sessionStorage.setItem('firebaseRole', firestoreRole);
                sessionStorage.setItem('userType', firestoreUserType);
              } catch (e) {
                console.error('Error guardando en sessionStorage:', e);
              }
            }
          } else {
            console.warn('⚠️ No se encontró documento de usuario en Firestore');
            setFirebaseRole(null);
            setUserType(null);
          }
        } catch (error) {
          console.error('❌ Error obteniendo datos de usuario:', error);
          setFirebaseRole(null);
          setUserType(null);
        }
      } else {
        // Usuario no autenticado - limpiar todo
        setFirebaseRole(null);
        setUserType(null);
        setUserRole(initialRoles.find((r) => r.name === 'Super Admin')!);
        try {
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('firebaseRole');
          sessionStorage.removeItem('userType');
        } catch (e) {
          console.error('Error limpiando sessionStorage:', e);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Restaurar desde sessionStorage al cargar la página
  useEffect(() => {
    try {
      const storedRoleName = sessionStorage.getItem('userRole');
      const storedFirebaseRole = sessionStorage.getItem('firebaseRole');
      const storedUserType = sessionStorage.getItem('userType');
      
      if (storedRoleName) {
        const role = initialRoles.find((r) => r.name === storedRoleName);
        if (role) {
          setUserRole(role);
        }
      }
      
      if (storedFirebaseRole) {
        setFirebaseRole(storedFirebaseRole);
      }
      
      if (storedUserType) {
        setUserType(storedUserType);
      }
    } catch (error) {
      console.error("No se pudo acceder a sessionStorage:", error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      firebaseRole, 
      userType, 
      setUserRole, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </AuthProvider>
    );
}