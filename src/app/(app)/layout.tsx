'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Nav as AdminNav } from '@/components/nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { EmpresaSelector } from '@/components/ui/empresa-selector';
import { NotificacionesDropdown } from '@/components/notificaciones-dropdown';
import { Nav as SupplierNav } from '@/components/proveedores/nav';
import { useAuth } from '../providers';
import { useEmpresa } from '@/contexts/EmpresaContext';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, isLoggingOut, user } = useAuth();
  const { empresaSeleccionada, loading: empresaLoading } = useEmpresa();
  
  useEffect(() => {
    // No redirigir si está en proceso de logout
    if (isLoggingOut || !userRole || !pathname) return;
    
    // No redirigir si estamos en login
    if (pathname === '/login' || pathname === '/') return;
    
    // Rutas exclusivas para PROVEEDORES (portal de proveedores)
    const isSupplierRoute = pathname.startsWith('/proveedores/perfil') ||
                           pathname.startsWith('/proveedores/dashboard') ||
                           pathname.startsWith('/proveedores/ordenes') ||
                           pathname.startsWith('/proveedores/facturas') ||
                           pathname.startsWith('/proveedores/facturacion') ||
                           pathname.startsWith('/proveedores/pagos') ||
                           pathname.startsWith('/proveedores/mensajeria') ||
                           pathname.startsWith('/proveedores/notificaciones') ||
                           pathname.startsWith('/proveedores/seguridad') ||
                           pathname.startsWith('/proveedores/mensajes') ||
                           pathname.startsWith('/facturas'); // Facturas compartida
    
    const isSupplierRole = userRole.name === 'Proveedor';
    
    // Si es proveedor y está en ruta de admin, redirigir a su dashboard
    if (isSupplierRole && !isSupplierRoute) {
      router.replace('/proveedores/dashboard');
      return;
    }
    
    // Si es admin y está en ruta de proveedor, redirigir a dashboard admin
    if (!isSupplierRole && isSupplierRoute) {
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
           <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6 justify-between">
            <EmpresaSelector />
            <div className="flex items-center gap-2">
              {empresaSeleccionada && (
                <NotificacionesDropdown empresa={empresaSeleccionada.codigo} />
              )}
              <UserNav />
            </div>
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
