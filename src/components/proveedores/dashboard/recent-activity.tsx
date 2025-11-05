
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const activities = [
  { id: 'INV-005', action: 'Factura cargada', date: 'Hace 2 horas', status: 'En revisión' },
  { id: 'OC-124', action: 'Orden confirmada', date: 'Hace 1 día', status: 'Completa' },
  { id: 'DOC-002', action: 'Documento actualizado', date: 'Hace 3 días', status: 'Vigente' },
  { id: 'TKT-034', action: 'Mensaje enviado', date: 'Hace 4 días', status: 'Respondido' },
];

const statusVariant: { [key: string]: string } = {
  'En revisión': 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800',
  'Completa': 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800',
  'Vigente': 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 bg-blue-100 text-blue-800',
  'Respondido': 'dark:bg-primary/20 dark:text-primary-foreground/80 border-primary/30 bg-primary/10 text-primary'
};


export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>
          Un resumen de las últimas acciones realizadas en el portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {activities.map(activity => (
                    <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.id}</TableCell>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell className="text-muted-foreground">{activity.date}</TableCell>
                        <TableCell>
                            <Badge className={cn('font-normal', statusVariant[activity.status])}>{activity.status}</Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
