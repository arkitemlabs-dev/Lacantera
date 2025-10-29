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
} from 'lucide-react';

export function KpiCards() {
  const kpis = [
    {
      title: 'Órdenes de Compra (Mes)',
      value: '125',
      icon: <FileStack className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: 'Facturas Pendientes',
      value: '12',
      icon: <FileClock className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: 'Complementos de Pago',
      value: '8',
      icon: <FilePlus2 className="h-6 w-6 text-muted-foreground" />,
    },
     {
      title: 'Tickets Abiertos',
      value: '5',
      icon: <Ticket className="h-6 w-6 text-muted-foreground" />,
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
