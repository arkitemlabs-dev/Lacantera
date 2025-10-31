
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const alerts = [
    {
        message: 'El documento "Constancia de Situación Fiscal" está por vencer en 15 días.',
        time: 'Hace 5 min',
        isUrgent: true,
    },
    {
        message: 'La factura INV-003 ha sido rechazada. Motivo: Monto incorrecto.',
        time: 'Hace 1 hora',
        isUrgent: true,
    }
];

export function Alerts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas y mensajes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert, index) => (
            <div key={index} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${alert.isUrgent ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                <div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
