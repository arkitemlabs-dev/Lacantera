
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

const LaCanteraLogo = () => (
    <Building className="h-6 w-6 text-primary" />
  );

export function Nav() {
  const pathname = usePathname();
  const { userRole } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!userRole || !userRole.permissions) return false;
    if (userRole.name === 'Super Admin') {
      return true;
    }
    if (userRole.permissions[item.href]) {
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
