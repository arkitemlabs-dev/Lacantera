
'use client';

import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye,
  Search,
  Upload,
  FileArchive,
  FileCheck2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PaymentStatus = 'Completado' | 'Pagado';

const kpis = [
  {
    title: 'Pagos Registrados',
    value: 5,
    description: 'Número total de transacciones',
    icon: <FileCheck2 className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: 'Complementos Pendientes',
    value: 2,
    description: 'Pagos esperando complemento',
    icon: <FileArchive className="h-6 w-6 text-muted-foreground" />,
  },
];

const payments = [
  {
    id: 'PAY-001',
    invoice: 'A-5831',
    amount: 3200.75,
    date: '2024-07-25',
    method: 'Transferencia SPEI',
    status: 'Completado',
    hasComplement: true,
  },
  {
    id: 'PAY-002',
    invoice: 'A-5830',
    amount: 12500.0,
    date: '2024-07-20',
    method: 'Transferencia SPEI',
    status: 'Pagado',
    hasComplement: false,
  },
  {
    id: 'PAY-003',
    invoice: 'A-5825',
    amount: 15200.0,
    date: '2024-07-18',
    method: 'Transferencia SPEI',
    status: 'Completado',
    hasComplement: true,
  },
  {
    id: 'PAY-004',
    invoice: 'A-5820',
    amount: 7350.2,
    date: '2024-07-12',
    method: 'Transferencia SPEI',
    status: 'Pagado',
    hasComplement: false,
  },
  {
    id: 'PAY-005',
    invoice: 'A-5815',
    amount: 980.0,
    date: '2024-07-01',
    method: 'Transferencia SPEI',
    status: 'Completado',
    hasComplement: true,
  },
];

const getStatusBadgeClass = (status: PaymentStatus) => {
  switch (status) {
    case 'Completado':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Pagado':
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
    default:
      return 'secondary';
  }
};

export default function PagosProveedorPage() {
  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="text-foreground">Pagos</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="bg-card/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Listado de Pagos</CardTitle>
          <CardDescription>
            Consulte el estado y los detalles de los pagos recibidos.
          </CardDescription>
          <div className="mt-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID de factura..."
                className="pl-8 w-full"
              />
            </div>
            <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pago</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha de Pago</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-center">Comprobante de pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Complemento de pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.id}</TableCell>
                  <TableCell>
                    <Link
                      href={`/proveedores/facturacion?search=${payment.invoice}`}
                      className="hover:underline text-blue-400"
                    >
                      {payment.invoice}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(payment.amount)}
                  </TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell className="text-center space-x-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Descargar</span>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'font-normal',
                        getStatusBadgeClass(payment.status as PaymentStatus)
                      )}
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {payment.hasComplement ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver Complemento</span>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className='h-8'>
                        <Upload className="mr-2 h-3 w-3" />
                        Subir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
