import {
  Bell,
  FileCheck2,
  FileUp,
  LifeBuoy,
  LogOut,
  Settings,
  User,
  UserPlus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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

const notificationIcons = {
  new_supplier: <UserPlus className="h-5 w-5 text-primary" />,
  doc_update: <FileUp className="h-5 w-5 text-yellow-500" />,
  invoice_status: <FileCheck2 className="h-5 w-5 text-green-500" />,
};

export function UserNav() {
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar-1');
  return (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/90"></span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4">
            <h4 className="font-medium text-base">Notificaciones</h4>
            <p className="text-sm text-muted-foreground">
              Tienes {notifications.filter(n => !n.read).length} notificaciones sin leer.
            </p>
          </div>
          <Separator />
          <div className="p-2 max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted">
                <div className="mt-1">{notificationIcons[notification.type]}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">{notification.date}</p>
                </div>
                {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-primary"></div>}
              </div>
            ))}
          </div>
          <Separator />
          <div className="p-2">
            <Button size="sm" className="w-full">Ver todas las notificaciones</Button>
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
