'use client';

import { Bell, X } from 'lucide-react';
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
import { useState } from 'react';

interface NotificacionesDropdownProps {
  empresa: string;
}

export function NotificacionesDropdown({ empresa }: NotificacionesDropdownProps) {
  const { notificaciones, noLeidasCount, marcarComoLeida, loading } = useNotificaciones(empresa);
  const [open, setOpen] = useState(false);

  // Mostrar solo las últimas 5 notificaciones
  const notificacionesRecientes = notificaciones.slice(0, 5);

  const handleNotificationClick = async (notificacion: any) => {
    if (!notificacion.leida) {
      await marcarComoLeida(notificacion.notificacionID);
    }
    
    // Si tiene link, navegar
    if (notificacion.link) {
      window.location.href = notificacion.link;
    }
    
    setOpen(false);
  };

  const marcarTodasComoLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida);
    for (const notif of noLeidas) {
      await marcarComoLeida(notif.notificacionID);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {noLeidasCount > 0 && (
            <>
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center animate-pulse"
              >
                {noLeidasCount > 9 ? '9+' : noLeidasCount}
              </Badge>
              {/* Punto de notificación pulsante */}
              <div className="absolute -right-1 -top-1 h-3 w-3 bg-red-500 rounded-full animate-ping" />
            </>
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          <div className="flex items-center gap-2">
            {noLeidasCount > 0 && (
              <>
                <Badge variant="secondary" className="ml-2">
                  {noLeidasCount} nuevas
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={marcarTodasComoLeidas}
                  className="h-6 px-2 text-xs"
                >
                  Marcar todas
                </Button>
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Cargando...
            </div>
          </div>
        )}

        {!loading && notificacionesRecientes.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No hay notificaciones
          </div>
        )}

        {!loading &&
          notificacionesRecientes.map((notificacion) => (
            <DropdownMenuItem
              key={notificacion.id}
              className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleNotificationClick(notificacion)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium leading-none ${
                      !notificacion.leida ? 'text-primary' : 'text-foreground'
                    }`}>
                      {notificacion.titulo}
                    </p>
                    {!notificacion.leida && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {notificacion.mensaje}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notificacion.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                    {notificacion.tipo && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {notificacion.tipo.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}

        {notificaciones.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notificaciones"
                className="text-center text-sm text-primary w-full font-medium"
                onClick={() => setOpen(false)}
              >
                Ver todas las notificaciones ({notificaciones.length})
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
