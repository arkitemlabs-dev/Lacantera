
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Home, User, ShoppingCart, FileText, MessageSquare, Bell, Shield, Building } from 'lucide-react';


const navItems = [
    { href: '/proveedores/dashboard', icon: Home, title: 'Inicio' },
    { href: '/proveedores/perfil', icon: User, title: 'Perfil' },
    { href: '/proveedores/ordenes-de-compra', icon: ShoppingCart, title: 'Órdenes de compra' },
    { href: '/proveedores/facturacion', icon: FileText, title: 'Facturación' },
    { href: '/proveedores/mensajeria', icon: MessageSquare, title: 'Mensajería' },
    { href: '/proveedores/notificaciones', icon: Bell, title: 'Notificaciones' },
    { href: '/proveedores/seguridad', icon: Shield, title: 'Seguridad' },
];

const LaCanteraLogo = () => {
    return <Building className="h-8 w-8 text-primary" />;
};

export function Nav() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/proveedores/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <LaCanteraLogo />
          <span>La Cantera</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.title, side: 'right' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
