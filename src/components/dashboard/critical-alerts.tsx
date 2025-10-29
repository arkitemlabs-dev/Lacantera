import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertTriangle, Clock } from 'lucide-react';

const alerts = [
  {
    title: 'Pagos Vencidos',
    value: '3',
    details: 'Facturas con más de 30 días de vencimiento.',
    icon: <Clock className="w-5 h-5 text-red-500" />,
  },
  {
    title: 'Órdenes Atrasadas',
    value: '5',
    details: 'Órdenes de compra con entrega retrasada.',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  },
];

export function CriticalAlerts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas Críticas</CardTitle>
        <CardDescription>
          Requieren atención inmediata para evitar interrupciones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg"
          >
            <div className="mt-1">{alert.icon}</div>
            <div className="flex-1">
              <p className="font-semibold">{alert.title}</p>
              <p className="text-sm text-muted-foreground">{alert.details}</p>
            </div>
            <div className="text-lg font-bold">{alert.value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
