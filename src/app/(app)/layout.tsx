'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Nav as AdminNav } from '@/components/nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { Nav as SupplierNav } from '@/components/proveedores/nav';
import { useAuth } from '../providers';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, isLoggingOut } = useAuth();
  
  useEffect(() => {
    // No redirigir si está en proceso de logout
    if (isLoggingOut || !userRole || !pathname) return;
    
    // No redirigir si estamos en login
    if (pathname === '/login' || pathname === '/') return;
    
    const isAdminRoute = !pathname.startsWith('/proveedores');
    const isSupplierRole = userRole.name === 'Proveedor';
    
    if (isSupplierRole && isAdminRoute) {
      router.replace('/proveedores/dashboard');
      return;
    }
    
    if (!isSupplierRole && !isAdminRoute) {
      router.replace('/dashboard');
      return;
    }
  }, [userRole, pathname, router, isLoggingOut]);
  
  const isSupplierPortal = userRole.name === 'Proveedor';
  const NavComponent = isSupplierPortal ? SupplierNav : AdminNav;
  
  return (
    <SidebarProvider>
      <NavComponent />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
           <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6 justify-end">
            <UserNav />
          </header>
          <main className="flex-1 bg-muted/40">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <AppLayoutContent>{children}</AppLayoutContent>
  );
}