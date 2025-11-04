
'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type PaymentStatus = 'Completado' | 'Pagado' | 'En revisión';

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
    id: 'PAY-006',
    invoice: 'A-5835',
    amount: 750.0,
    date: '2024-07-28',
    method: 'Transferencia SPEI',
    status: 'En revisión',
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
    case 'En revisión':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
    default:
      return 'secondary';
  }
};

export default function PagosProveedorPage() {
  const [selectedPayment, setSelectedPayment] = useState<typeof payments[0] | null>(null);

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedPayment(null)}>
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/proveedores/dashboard" className="hover:text-foreground">
            Inicio
          </Link>
          <span>&gt;</span>
          <span className="text-foreground">Pagos</span>
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
                  <SelectItem value="en-revision">En revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Pago</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Método</TableHead>
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
                        {payment.hasComplement || payment.status === 'En revisión' ? (
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">Ver Complemento</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver Complemento</p>
                              </TooltipContent>
                            </Tooltip>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Descargar Complemento</span>
                                </Button>
                               </TooltipTrigger>
                               <TooltipContent>
                                 <p>Descargar Complemento</p>
                               </TooltipContent>
                             </Tooltip>
                          </div>
                        ) : (
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Upload className="mr-2 h-3 w-3" />
                              Subir
                            </Button>
                          </DialogTrigger>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </CardContent>
        </Card>

        {selectedPayment && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Complemento de Pago</DialogTitle>
              <DialogDescription>
                Adjunte el archivo XML y PDF para el pago {selectedPayment.id}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Arrastra tus archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    XML y PDF requeridos
                  </p>
                  <Input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
            </div>
            <DialogFooter>
              <DialogTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
              </DialogTrigger>
              <Button>Subir Documento</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </main>
    </Dialog>
  );
}
