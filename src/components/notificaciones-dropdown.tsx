'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface NotificacionesDropdownProps {
  empresa: string;
}

export function NotificacionesDropdown({ empresa }: NotificacionesDropdownProps) {
  const { notificaciones, noLeidasCount, marcarComoLeida, loading } = useNotificaciones(empresa);

  // Mostrar solo las últimas 5 notificaciones
  const notificacionesRecientes = notificaciones.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {noLeidasCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {noLeidasCount > 9 ? '9+' : noLeidasCount}
            </Badge>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {noLeidasCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {noLeidasCount} nuevas
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        )}

        {!loading && notificacionesRecientes.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        )}

        {!loading &&
          notificacionesRecientes.map((notificacion) => (
            <DropdownMenuItem
              key={notificacion.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => {
                if (!notificacion.leida) {
                  marcarComoLeida(notificacion.notificacionID);
                }
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none mb-1">
                    {notificacion.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notificacion.mensaje}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notificacion.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
                {!notificacion.leida && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

        {notificaciones.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notificaciones"
                className="text-center text-sm text-primary w-full"
              >
                Ver todas las notificaciones
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
