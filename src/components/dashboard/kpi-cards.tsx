import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileWarning, Banknote, FileStack } from 'lucide-react';

export function KpiCards() {
  const kpis = [
    {
      title: 'Órdenes Abiertas',
      value: '12',
      icon: <FileStack className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: 'Gastos Totales (Julio)',
      value: '$45,231.89',
      icon: <Banknote className="h-6 w-6 text-muted-foreground" />,
    },
    {
      title: 'Proveedores que Requieren Atención',
      value: '3',
      icon: <FileWarning className="h-6 w-6 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
