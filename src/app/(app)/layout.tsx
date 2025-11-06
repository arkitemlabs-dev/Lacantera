
'use client';

import { usePathname } from 'next/navigation';
import { Nav as AdminNav } from '@/components/nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { Nav as SupplierNav } from '@/components/proveedores/nav';
import { AuthProvider, useAuth } from '../providers';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userRole } = useAuth();
  
  // Simplified logic: if it's a supplier route, show supplier nav. Otherwise, show admin nav.
  const isSupplierPortal = pathname.startsWith('/proveedores/') && userRole.name === 'Proveedor';

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
