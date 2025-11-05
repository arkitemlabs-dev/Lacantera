
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useMemo } from 'react';

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
import { Home, User, ShoppingCart, FileText, MessageSquare, Bell, Shield, Building, CreditCard } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '../ui/avatar';


const allNavItems = [
    { href: '/proveedores/dashboard', icon: Home, title: 'Inicio' },
    { href: '/proveedores/perfil', icon: User, title: 'Perfil' },
    { href: '/proveedores/ordenes-de-compra', icon: ShoppingCart, title: 'Órdenes de compra' },
    { href: '/proveedores/facturacion', icon: FileText, title: 'Facturación' },
    { href: '/proveedores/pagos', icon: CreditCard, title: 'Pagos' },
    { href: '/proveedores/mensajeria', icon: MessageSquare, title: 'Mensajería' },
    { href: '/proveedores/notificaciones', icon: Bell, title: 'Notificaciones' },
    { href: '/proveedores/seguridad', icon: Shield, title: 'Seguridad' },
];

const LaCanteraLogo = () => {
    return <Building className="h-8 w-8 text-primary" />;
};

export function Nav({ searchTerm }: { searchTerm: string }) {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');

  const navItems = useMemo(() => {
    if (!searchTerm) {
      return allNavItems;
    }
    return allNavItems.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);


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
                isActive={pathname === item.href || (item.href !== '/proveedores/dashboard' && pathname.startsWith(item.href))}
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
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-3 p-2 rounded-md">
            <Avatar className="h-10 w-10">
              {userAvatar && (
                <Image
                  src={userAvatar.imageUrl}
                  alt={userAvatar.description}
                  width={40}
                  height={40}
                  data-ai-hint={userAvatar.imageHint}
                />
              )}
              <AvatarFallback>SH</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">Shirley.H</p>
                <p className="text-xs leading-none text-muted-foreground truncate">shirley.h@proveedor.com</p>
            </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
