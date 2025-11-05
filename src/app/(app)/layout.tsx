
'use client';
import { Nav } from '@/components/nav';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialRoles, type Role } from '@/lib/roles';

type AuthContextType = {
  userRole: Role;
  setUserRole: React.Dispatch<React.SetStateAction<Role>>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<Role>(initialRoles.find(r => r.name === 'Super Admin')!);

  useEffect(() => {
    const storedRoleName = sessionStorage.getItem('userRole');
    const role = initialRoles.find(r => r.name === storedRoleName);
    if (role) {
      setUserRole(role);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userRole, setUserRole }}>
      <SidebarProvider>
        <Nav />
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
             <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6 justify-end">
              <UserNav />
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}
