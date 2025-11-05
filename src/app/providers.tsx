
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialRoles, type Role } from '@/lib/roles';
import { ThemeProvider } from '@/components/theme-provider';

type AuthContextType = {
  userRole: Role;
  setUserRole: React.Dispatch<React.SetStateAction<Role>>;
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
  const [userRole, setUserRole] = useState<Role>(
    initialRoles.find((r) => r.name === 'Super Admin')!
  );

  useEffect(() => {
    try {
      const storedRoleName = sessionStorage.getItem('userRole');
      if (storedRoleName) {
        const role = initialRoles.find((r) => r.name === storedRoleName) || initialRoles.find(r => r.name === 'Proveedor');
        if (role) {
          setUserRole(role);
        }
      }
    } catch (error) {
        console.error("Could not access sessionStorage. Running on the server?")
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userRole, setUserRole }}>
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
    )
}
