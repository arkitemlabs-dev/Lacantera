
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  CheckCircle2,
  FileText,
  MailCheck,
  MessageSquare,
  Users,
} from 'lucide-react';
import { differenceInDays, format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

import { notifications as initialNotifications } from '@/lib/data';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const notificationConfig = {
  new_supplier: {
    icon: <Users className="h-6 w-6 text-blue-500" />,
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    tagClass: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
  doc_update: {
    icon: <AlertOctagon className="h-6 w-6 text-yellow-500" />,
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    tagClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  },
  invoice_status: {
    icon: <FileText className="h-6 w-6 text-green-500" />,
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    tagClass: 'bg-green-500/20 text-green-200 border-green-500/30',
  },
  new_message: {
    icon: <MessageSquare className="h-6 w-6 text-purple-500" />,
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    tagClass: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
  },
  payment_done: {
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    tagClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
  },
} as const;

type GroupedNotifications = {
  [key: string]: Notification[];
};

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement>(null);

  const groupNotificationsByDate = (notifs: Notification[]): GroupedNotifications => {
    return notifs.reduce((acc, notification) => {
      const date = new Date(notification.date);
      let group: string;
      if (isToday(date)) {
        group = 'Hoy';
      } else if (isYesterday(date)) {
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

  const loadMoreNotifications = useCallback(() => {
    // Simulate fetching more data
    console.log('Loading more...');
    setTimeout(() => {
      const newNotifications: Notification[] = Array.from({ length: 5 }).map((_, i) => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - (notifications.length + i + 1));
        return {
          id: notifications.length + i + 1,
          type: 'invoice_status',
          title: 'Factura Antigua Revisada',
          description: `La factura #INV-OLD-${notifications.length + i} fue revisada.`,
          date: pastDate.toISOString(),
          read: true,
          link: '#',
          tag: 'Archivo'
        };
      });
      setNotifications(prev => [...prev, ...newNotifications]);
      if (notifications.length > 20) {
        setHasMore(false);
      }
    }, 1000);
  }, [notifications.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreNotifications();
        }
      },
      { rootMargin: '100px' }
    );
    if (loader.current) {
      observer.observe(loader.current);
    }
    return () => {
      if (loader.current) {
        observer.unobserve(loader.current);
      }
    };
  }, [hasMore, loadMoreNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
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
                const config = notificationConfig[notification.type as keyof typeof notificationConfig];
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
        <div ref={loader} className="h-10 text-center">
            {hasMore && 'Cargando más notificaciones...'}
        </div>
      </div>
    </main>
  );
}
