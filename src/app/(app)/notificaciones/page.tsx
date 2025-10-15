import {
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const notifications = [
  {
    id: 1,
    type: 'warning',
    title: 'Documento por vencer',
    description:
      'Estimado PROV-001, uno de sus documentos está próximo a vencer. Por favor, revise la sección de documentos para más detalles.',
    time: 'Hace 5 minutos',
    tag: 'Documento por vencer',
  },
  {
    id: 2,
    type: 'success',
    title: 'Pago Aplicado',
    description: 'Se ha aplicado un pago a su cuenta de proveedor PROV-001.',
    time: 'Hace 20 minutos',
    tag: 'Pago aplicado',
  },
  {
    id: 3,
    type: 'error',
    title: 'Factura Rechazada - ID PROV-001',
    description:
      'Su factura ha sido rechazada. Por favor, revise los detalles en el portal y realice las correcciones necesarias para PROV-001.',
    time: 'Hace 35 minutos',
    tag: 'Factura rechazada',
  },
  {
    id: 4,
    type: 'info',
    title: 'Nueva Alerta Automática',
    description:
      'Se ha generado una nueva alerta automática para PROV-001. Revise su portal de proveedor para más detalles.',
    time: 'Hace 50 minutos',
    tag: 'Alerta automática',
  },
  {
    id: 5,
    type: 'warning',
    title: 'Próximo vencimiento de documento',
    description:
      'Tu documento está próximo a vencer. Por favor, revisa tus documentos en el portal para evitar interrupciones en tus operaciones.',
    time: 'Hace 65 minutos',
    tag: 'Documento por vencer',
  },
];

const notificationConfig = {
  warning: {
    icon: <AlertOctagon className="h-6 w-6 text-yellow-500" />,
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    tagVariant: 'secondary',
    tagClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  },
  success: {
    icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    tagVariant: 'secondary',
    tagClass: 'bg-green-500/20 text-green-200 border-green-500/30',
  },
  error: {
    icon: <XCircle className="h-6 w-6 text-red-500" />,
    borderColor: 'border-red-500/50',
    bgColor: 'bg-red-500/10',
    tagVariant: 'destructive',
    tagClass: 'bg-red-500/20 text-red-200 border-red-500/30',
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-500" />,
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    tagVariant: 'default',
    tagClass: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
  },
} as const;

export default function NotificacionesPage() {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
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
                  'border-l-4',
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
                   <Badge className={cn('whitespace-nowrap', config.tagClass)} variant={config.tagVariant}>
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
