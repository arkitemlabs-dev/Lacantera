'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialRoles, type Role } from '@/lib/roles';
import { ThemeProvider } from '@/components/theme-provider';
import { EmpresaProvider } from '@/contexts/EmpresaContext';
import { SessionProvider, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

type AuthContextType = {
  user: Session['user'] | null;
  userRole: Role;
  firebaseRole: string | null;
  userType: string | null;
  setUserRole: React.Dispatch<React.SetStateAction<Role>>;
  loading: boolean;
  isLoggingOut: boolean;
  setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [firebaseRole, setFirebaseRole] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role>(
    initialRoles.find((r) => r.name === 'Super Admin')!
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const role = session.user.role;
      const type = session.user.userType;

      console.log('📋 Usuario autenticado:', {
        id: session.user.id,
        email: session.user.email,
        role: role,
        userType: type,
      });

      setFirebaseRole(role);
      setUserType(type);

      let mappedRole: Role | undefined;

      // Mapear roles del backend a roles del frontend
      // Roles de administrador:
      // - super-admin / admin → Super Admin (acceso total)
      // - compras → Compras (proveedores, órdenes)
      // - contabilidad → Contabilidad (facturas, pagos)
      // - solo-lectura → Solo lectura (solo ver)

      if (role === 'proveedor') {
        mappedRole = initialRoles.find((r) => r.name === 'Proveedor');
      } else if (role === 'super-admin') {
        mappedRole = initialRoles.find((r) => r.name === 'Super Admin');
      } else if (role === 'admin') {
        mappedRole = initialRoles.find((r) => r.name === 'Super Admin');
      } else if (role === 'compras') {
        mappedRole = initialRoles.find((r) => r.name === 'Compras');
      } else if (role === 'contabilidad') {
        mappedRole = initialRoles.find((r) => r.name === 'Contabilidad');
      } else if (role === 'solo-lectura') {
        mappedRole = initialRoles.find((r) => r.name === 'Solo lectura');
      } else if (role === 'admin_super') {
        // Compatibilidad con formato antiguo
        mappedRole = initialRoles.find((r) => r.name === 'Super Admin');
      } else if (role === 'admin_compras') {
        // Compatibilidad con formato antiguo
        mappedRole = initialRoles.find((r) => r.name === 'Compras');
      }

      if (mappedRole) {
        setUserRole(mappedRole);
        try {
          sessionStorage.setItem('userRole', mappedRole.name);
          sessionStorage.setItem('firebaseRole', role);
          sessionStorage.setItem('userType', type);
        } catch (e) {
          console.error('Error guardando en sessionStorage:', e);
        }
      }
    } else if (status === 'unauthenticated') {
      console.log('🚪 Usuario no autenticado');
      setFirebaseRole(null);
      setUserType(null);

      if (!isLoggingOut) {
        try {
          sessionStorage.removeItem('userRole');
          sessionStorage.removeItem('firebaseRole');
          sessionStorage.removeItem('userType');
          sessionStorage.removeItem('empresaSeleccionada');
        } catch (e) {
          console.error('Error limpiando sessionStorage:', e);
        }
      }
    }
  }, [session, status, isLoggingOut]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        userRole,
        firebaseRole,
        userType,
        setUserRole,
        loading: status === 'loading',
        isLoggingOut,
        setIsLoggingOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EmpresaProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </EmpresaProvider>
    </AuthProvider>
  );
}
