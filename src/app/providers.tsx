'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialRoles, type Role } from '@/lib/roles';
import { ThemeProvider } from '@/components/theme-provider';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

type AuthContextType = {
  user: User | null;
  userRole: Role;
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
  const [userRole, setUserRole] = useState<Role>(
    initialRoles.find((r) => r.name === 'Super Admin')!
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      const storedRoleName = sessionStorage.getItem('userRole');
      if (storedRoleName) {
        const role = initialRoles.find((r) => r.name === storedRoleName);
        setUserRole(role || initialRoles.find(r => r.name === 'Super Admin')!);
      }
    } catch (error) {
        console.error("Could not access sessionStorage. Running on the server?")
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, setUserRole, loading }}>
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
