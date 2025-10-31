
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  MessageSquare,
  Bell,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function KpiCards() {
  const kpis = [
    {
      title: 'Órdenes de compra',
      value: '12',
      description: 'Pendientes de confirmación',
      icon: <ShoppingCart className="h-5 w-5 text-muted-foreground" />,
      link: '/proveedores/ordenes-de-compra'
    },
    {
      title: 'Facturación',
      value: '3',
      description: 'Facturas en revisión',
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      link: '/proveedores/facturacion'
    },
    {
      title: 'Mensajería y soporte',
      value: '5',
      description: 'Tickets abiertos',
      icon: <MessageSquare className="h-5 w-5 text-muted-foreground" />,
      link: '/proveedores/mensajeria'
    },
     {
      title: 'Notificaciones',
      value: '8',
      description: 'Alertas recientes',
      icon: <Bell className="h-5 w-5 text-muted-foreground" />,
      link: '/proveedores/notificaciones'
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            {kpi.icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.description}</p>
             <Button variant="link" asChild className="px-0 pt-2 h-auto text-xs">
                <Link href={kpi.link}>
                    Ver detalle
                    <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
