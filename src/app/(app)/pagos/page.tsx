
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  DollarSign,
  CheckCircle,
  FilePlus2,
  Search,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { payments } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import Link from 'next/link';

const kpiCards = [
  {
    title: 'Total por Pagar (Mes)',
    value: '$45,231.89',
    icon: <DollarSign className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: 'Pagos Realizados (Mes)',
    value: '$120,789.00',
    icon: <CheckCircle className="h-6 w-6 text-muted-foreground" />,
  },
  {
    title: 'Complementos de Pago (Pendientes)',
    value: '8',
    icon: <FilePlus2 className="h-6 w-6 text-muted-foreground" />,
  },
];

const getStatusVariant = (status: Payment['status']) => {
    switch (status) {
        case 'Realizado':
            return 'bg-green-500/20 text-green-200 border-green-500/30';
        case 'Programado':
            return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
        case 'Cancelado':
            return 'bg-red-500/20 text-red-200 border-red-500/30';
    }
}

export default function PagosPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <h1 className="text-3xl font-semibold">Dashboard de Pagos</h1>
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-start gap-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Pagos</CardTitle>
            <CardDescription>
              Busca y gestiona todos los pagos registrados en el sistema.
            </CardDescription>
            <div className="mt-4 flex items-center gap-2">
              <Input
                placeholder="Buscar por ID de pago, factura o proveedor..."
                className="max-w-lg"
              />
              <Button>
                <Search className="mr-2 h-4 w-4" /> Buscar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pago</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha Ejecución</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-center">Comprobantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>
                        <Link href={`/facturas?search=${payment.invoiceId}`} className='hover:underline text-blue-400'>
                            {payment.invoiceId}
                        </Link>
                    </TableCell>
                    <TableCell>{payment.supplierName}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.executionDate}</TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusVariant(payment.status))}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button variant="outline" size="sm" disabled={!payment.paymentProof}>
                        <Download className="mr-2 h-3 w-3" />
                        Pago
                      </Button>
                       <Button variant="outline" size="sm" disabled={!payment.paymentComplement}>
                        <Download className="mr-2 h-3 w-3" />
                        Complemento
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
           <CardFooter className="flex justify-center border-t pt-4">
                <Button variant="outline">Cargar más</Button>
            </CardFooter>
        </Card>
      </div>
    </main>
  );
}
