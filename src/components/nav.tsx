
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { navItems } from '@/app/(app)/nav';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Building } from 'lucide-react';
import { useAuth } from '@/app/providers';
import { MensajeriaBadge } from '@/components/mensajeria-badge';

const LaCanteraLogo = () => (
    <Building className="h-6 w-6 text-primary" />
  );

export function Nav() {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    // Super Admin always sees everything
    if (userRole.name === 'Super Admin') {
      return true;
    }
    // For other roles, check permissions
    if (userRole?.permissions?.[item.href]?.includes('ver')) {
      return true;
    }
    return false;
  });


  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <LaCanteraLogo />
          <span>La Cantera</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.title, side: 'right' }}
              >
                <Link href={item.href} className="relative">
                  <item.icon />
                  <span>{item.title}</span>
                  {item.href === '/mensajeria' && (
                    <MensajeriaBadge className="ml-auto" />
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

