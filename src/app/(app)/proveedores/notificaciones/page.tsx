'use client';

import {
  AlertOctagon,
  CheckCircle2,
  Info,
  XCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const notifications = [
  {
    id: 1,
    type: 'warning',
    title: 'Documento por vencer',
    description:
      'Su "Opinión de Cumplimiento" está próxima a vencer. Por favor, actualícela para evitar interrupciones.',
    time: 'Hace 5 minutos',
    tag: 'Documentos',
  },
  {
    id: 2,
    type: 'success',
    title: 'Pago Aplicado',
    description: 'Se ha aplicado un pago por $3,200.75 correspondiente a la factura A-5831.',
    time: 'Hace 20 minutos',
    tag: 'Pagos',
  },
  {
    id: 3,
    type: 'error',
    title: 'Factura Rechazada',
    description:
      'Su factura A-5829 ha sido rechazada por un error en los conceptos. Revise los detalles y vuelva a cargarla.',
    time: 'Hace 35 minutos',
    tag: 'Facturación',
  },
  {
    id: 4,
    type: 'info',
    title: 'Nueva Orden de Compra',
    description:
      'Ha recibido una nueva orden de compra, la OC-129, por un monto de $5,800.00.',
    time: 'Hace 50 minutos',
    tag: 'Órdenes de Compra',
  },
  {
    id: 5,
    type: 'message',
    title: 'Nuevo Mensaje de Soporte',
    description:
      'El equipo de La Cantera ha respondido a su ticket sobre la OC-128.',
    time: 'Hace 2 horas',
    tag: 'Mensajería',
  },
];

const notificationConfig = {
  warning: {
    icon: <AlertOctagon className="h-6 w-6 text-yellow-500" />,
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    tagClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  },
  success: {
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    tagClass: 'bg-green-500/20 text-green-200 border-green-500/30',
  },
  error: {
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    tagClass: 'bg-red-500/20 text-red-200 border-red-500/30',
  },
  info: {
    icon: <FileText className="h-6 w-6 text-blue-500" />,
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    tagClass: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
  message: {
    icon: <MessageSquare className="h-6 w-6 text-purple-500" />,
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    tagClass: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
  },
} as const;

export default function NotificacionesProveedorPage() {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
       <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">Inicio</Link>
        <span>&gt;</span>
        <span className="text-foreground">Notificaciones</span>
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Notificaciones</h1>
        <p className="text-muted-foreground">
          Aquí encontrará todas las alertas y actualizaciones importantes de su
          cuenta.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="space-y-4">
          {notifications.map((notification) => {
            const config = notificationConfig[notification.type as keyof typeof notificationConfig];
            return (
              <Card
                key={notification.id}
                className={cn(
                  'border-l-4 transition-all hover:bg-card/90',
                  config.borderColor,
                  config.bgColor
                )}
              >
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div>{config.icon}</div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold">
                      {notification.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {notification.description}
                    </CardDescription>
                     <p className="text-xs text-muted-foreground mt-2">
                      {notification.time}
                    </p>
                  </div>
                   <Badge className={cn('whitespace-nowrap font-normal', config.tagClass)}>
                    {notification.tag}
                  </Badge>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
