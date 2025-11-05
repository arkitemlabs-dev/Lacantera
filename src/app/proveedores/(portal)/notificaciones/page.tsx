
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  CheckCircle2,
  FileText,
  MailCheck,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type NotificationType = 'warning' | 'success' | 'error' | 'info' | 'message';

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  date: string;
  read: boolean;
  link: string;
  tag: string;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: 'warning',
    title: 'Documento por vencer',
    description:
      'Su "Opinión de Cumplimiento" está próxima a vencer. Por favor, actualícela para evitar interrupciones.',
    date: new Date().toISOString(),
    read: false,
    link: '/proveedores/perfil',
    tag: 'Documentos',
  },
  {
    id: 2,
    type: 'success',
    title: 'Pago Aplicado',
    description: 'Se ha aplicado un pago por $3,200.75 correspondiente a la factura A-5831.',
    date: new Date().toISOString(),
    read: false,
    link: '/proveedores/pagos',
    tag: 'Pagos',
  },
  {
    id: 3,
    type: 'error',
    title: 'Factura Rechazada',
    description:
      'Su factura A-5829 ha sido rechazada por un error en los conceptos. Revise los detalles y vuelva a cargarla.',
    date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    read: true,
    link: '/proveedores/facturacion',
    tag: 'Facturación',
  },
  {
    id: 4,
    type: 'info',
    title: 'Nueva Orden de Compra',
    description:
      'Ha recibido una nueva orden de compra, la OC-129, por un monto de $5,800.00.',
    date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    read: true,
    link: '/proveedores/ordenes-de-compra',
    tag: 'Órdenes de Compra',
  },
  {
    id: 5,
    type: 'message',
    title: 'Nuevo Mensaje de Soporte',
    description:
      'El equipo de La Cantera ha respondido a su ticket sobre la OC-128.',
    date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
    read: false,
    link: '/proveedores/mensajeria',
    tag: 'Mensajería',
  },
];

const notificationConfig = {
  warning: {
    icon: <AlertOctagon className="h-6 w-6 text-yellow-500" />,
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    tagClass: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  success: {
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    tagClass: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800',
  },
  error: {
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    tagClass: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 bg-red-100 text-red-800',
  },
  info: {
    icon: <FileText className="h-6 w-6 text-blue-500" />,
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    tagClass: 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 bg-blue-100 text-blue-800',
  },
  message: {
    icon: <MessageSquare className="h-6 w-6 text-purple-500" />,
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    tagClass: 'dark:bg-purple-500/20 dark:text-purple-200 border-purple-500/30 bg-purple-100 text-purple-800',
  },
} as const;


type GroupedNotifications = {
  [key: string]: Notification[];
};

export default function NotificacionesProveedorPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  
  const groupNotificationsByDate = (notifs: Notification[]): GroupedNotifications => {
    return notifs.reduce((acc, notification) => {
      const date = new Date(notification.date);
      let group: string;

      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        group = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        group = 'Ayer';
      } else {
        group = 'Más antiguas';
      }
      
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(notification);
      return acc;
    }, {} as GroupedNotifications);
  };
  
  const groupedNotifications = groupNotificationsByDate(notifications);

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
       <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">Inicio</Link>
        <span>&gt;</span>
        <span className="text-foreground">Notificaciones</span>
      </div>
      <div className="mx-auto grid w-full max-w-3xl gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Notificaciones</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `Tienes ${unreadCount} notificaciones sin leer.` : 'No tienes notificaciones nuevas.'}
            </p>
          </div>
          <Button onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
            <MailCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-3xl items-start gap-8">
        {Object.entries(groupedNotifications).map(([group, notifs]) => (
          <div key={group}>
            <h2 className="text-lg font-semibold mb-4">{group}</h2>
            <div className="space-y-4">
              {notifs.map(notification => {
                const config = notificationConfig[notification.type];
                return (
                  <Link href={notification.link} key={notification.id} onClick={() => handleNotificationClick(notification.id)}>
                    <Card
                      className={cn(
                        'border-l-4 transition-all hover:shadow-md hover:bg-card/95',
                        config.borderColor,
                        !notification.read ? config.bgColor : 'bg-background/50'
                      )}
                    >
                      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
                        <div className="mt-1">{config.icon}</div>
                        <div className="flex-1">
                          <div className='flex items-center justify-between'>
                            <CardTitle className="text-base font-semibold">
                              {notification.title}
                            </CardTitle>
                             {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></div>}
                          </div>
                          <CardDescription className="mt-1">
                            {notification.description}
                          </CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.date), "dd MMMM 'a las' HH:mm", { locale: es })}
                          </p>
                        </div>
                        <Badge className={cn('whitespace-nowrap', config.tagClass)}>
                          {notification.tag}
                        </Badge>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
