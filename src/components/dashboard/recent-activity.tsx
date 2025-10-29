import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  MessageSquare,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../ui/badge';

const activities = [
  {
    icon: <UserPlus className="h-5 w-5" />,
    text: (
      <p>
        Nuevo proveedor <span className="font-semibold">"Plásticos del Sur"</span> ha sido registrado.
      </p>
    ),
    time: 'Hace 15 min',
    link: '#',
  },
  {
    icon: <FileText className="h-5 w-5" />,
    text: (
      <p>
        Factura <span className="font-semibold">#INV-005</span> ha sido{' '}
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 h-5">Aprobada</Badge>.
      </p>
    ),
    time: 'Hace 1 hora',
    link: '#',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    text: (
      <p>
        Nuevo mensaje en ticket <span className="font-semibold">#T-129</span> sobre orden de compra.
      </p>
    ),
    time: 'Hace 3 horas',
    link: '#',
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>
          Últimos movimientos en el portal de proveedores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="bg-muted p-2 rounded-full">{activity.icon}</div>
              <div className="flex-1 text-sm">{activity.text}</div>
              <div className="text-xs text-muted-foreground">{activity.time}</div>
              <Button variant="ghost" size="icon" asChild>
                <a href={activity.link}>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
