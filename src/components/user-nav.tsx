
'use client';

import {
  Bell,
  FileCheck2,
  FileUp,
  LifeBuoy,
  LogOut,
  Settings,
  User,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { notifications } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ThemeToggle } from './theme-toggle';

const notificationIcons: Record<string, React.ReactNode> = {
  new_supplier: <UserPlus className="h-5 w-5 text-blue-500" />,
  doc_update: <FileUp className="h-5 w-5 text-yellow-500" />,
  invoice_status: <FileCheck2 className="h-5 w-5 text-green-500" />,
  new_message: <MessageSquare className="h-5 w-5 text-purple-500" />,
};

export function UserNav() {
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');
  const pathname = usePathname();
  const isProviderPortal = pathname.startsWith('/proveedores');
  const notificationsLink = isProviderPortal ? '/proveedores/notificaciones' : '/notificaciones';
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex items-center gap-4">
       <ThemeToggle />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/90"></span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4">
            <h4 className="font-medium text-base">Notificaciones</h4>
            <p className="text-sm text-muted-foreground">
              Tienes {unreadCount} notificaciones sin leer.
            </p>
          </div>
          <Separator />
          <div className="p-2 max-h-80 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <Link href={notification.link} key={notification.id} className="block">
                <div className="flex items-start gap-3 rounded-md p-2 hover:bg-muted">
                  <div className="mt-1">{notificationIcons[notification.type]}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0"></div>}
                </div>
              </Link>
            ))}
          </div>
          <Separator />
          <div className="p-2">
            <Button size="sm" className="w-full" asChild>
              <Link href={notificationsLink}>Ver todas las notificaciones</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Juan Pérez</p>
              <p className="text-xs leading-none text-muted-foreground">
                admin@lacantora.com
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <User className="mr-2" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy className="mr-2" />
              <span>Soporte</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <Link href="/login">
             <DropdownMenuItem>
                <LogOut className="mr-2" />
                <span>Cerrar Sesión</span>
             </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
