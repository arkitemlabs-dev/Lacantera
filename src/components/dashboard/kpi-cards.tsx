
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileStack,
  FileClock,
  FilePlus2,
  Ticket,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function KpiCards() {
  const kpis = [
    {
      title: 'Órdenes de Compra (Mes)',
      value: '125',
      description: 'Órdenes procesadas este mes',
      icon: <FileStack className="h-6 w-6 text-muted-foreground" />,
      link: '/ordenes-de-compra',
    },
    {
      title: 'Facturas Pendientes',
      value: '12',
      description: 'Facturas en espera de revisión',
      icon: <FileClock className="h-6 w-6 text-muted-foreground" />,
      link: '/facturas',
    },
    {
      title: 'Complementos de Pago',
      value: '8',
      description: 'Pendientes de registrar',
      icon: <FilePlus2 className="h-6 w-6 text-muted-foreground" />,
      link: '/pagos',
    },
     {
      title: 'Tickets Abiertos',
      value: '5',
      description: 'Conversaciones sin resolver',
      icon: <Ticket className="h-6 w-6 text-muted-foreground" />,
      link: '/mensajeria',
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
