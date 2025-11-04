
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  Download,
  FileText,
  Eye,
  Calendar as CalendarIcon,
  ListFilter,
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
import { payments, suppliers } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { Payment, PaymentStatus } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getStatusVariant = (status: PaymentStatus) => {
  switch (status) {
    case 'Completo':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Pendiente complemento':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
  }
};

type DocumentType = 'Pago' | 'Complemento';

export default function PagosPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    payment: Payment;
    type: DocumentType;
  } | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState('todas');
  const [supplier, setSupplier] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
        // Normalizing date for comparison. Assuming 'DD/MM/YYYY' format.
        const parts = payment.executionDate.split('/');
        const paymentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);

        const dateFilter = !dateRange?.from || (paymentDate >= dateRange.from && (!dateRange.to || paymentDate <= dateRange.to));
        const statusFilter = status === 'todas' || payment.status.toLowerCase().replace(/ /g, '-') === status;
        const supplierFilter = supplier === 'todos' || payment.supplierName === suppliers.find(s => s.id === supplier)?.name;
        const searchFilter =
            payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

        return dateFilter && statusFilter && supplierFilter && searchFilter;
    });
  }, [dateRange, status, supplier, searchTerm]);


  const handleOpenDialog = (payment: Payment, type: DocumentType) => {
    setSelectedDocument({ payment, type });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedDocument(null);
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setStatus('todas');
    setSupplier('todos');
    setSearchTerm('');
  };

  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <h1 className="text-3xl font-semibold">Pagos</h1>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="mx-auto grid w-full max-w-7xl items-start gap-6">
           <Card>
            <CardHeader>
                <CardTitle>Filtros de Búsqueda</CardTitle>
                <CardDescription>
                Refine los resultados de los pagos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !dateRange && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                            <>
                                {format(dateRange.from, 'LLL dd, y', { locale: es })} -{' '}
                                {format(dateRange.to, 'LLL dd, y', { locale: es })}
                            </>
                            ) : (
                            format(dateRange.from, 'LLL dd, y', { locale: es })
                            )
                        ) : (
                            <span>Rango de Fechas</span>
                        )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={es}
                        />
                    </PopoverContent>
                    </Popover>
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="todas">Todos los estados</SelectItem>
                    <SelectItem value="completo">Completo</SelectItem>
                    <SelectItem value="pendiente-complemento">Pendiente complemento</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Buscar por ID, factura, proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <Button variant="outline" onClick={clearFilters}>
                <ListFilter className="mr-2 h-4 w-4" />
                Limpiar Filtros
                </Button>
            </CardFooter>
        </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Pagos</CardTitle>
              <CardDescription>
                Busca y gestiona todos los pagos registrados en el sistema.
              </CardDescription>
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
                    <TableHead className="text-center">Comprobante de Pago</TableHead>
                    <TableHead className="text-center">Complemento de Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.id}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/facturas?search=${payment.invoiceId}`}
                          className="hover:underline text-blue-400"
                        >
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
                      <TableCell className="text-center space-x-1">
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!payment.paymentProof}
                            onClick={() => handleOpenDialog(payment, 'Pago')}
                            className='h-8 w-8 bg-transparent hover:bg-primary/90'
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Pago</span>
                          </Button>
                        </DialogTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!payment.paymentProof}
                          className='h-8 w-8 bg-transparent hover:bg-primary/90'
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Descargar Pago</span>
                        </Button>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!payment.paymentComplement}
                             onClick={() => handleOpenDialog(payment, 'Complemento')}
                             className='h-8 w-8 bg-transparent hover:bg-primary/90'
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Complemento</span>
                          </Button>
                        </DialogTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!payment.paymentComplement}
                          className='h-8 w-8 bg-transparent hover:bg-primary/90'
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Descargar Complemento</span>
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
        {selectedDocument && (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Visualizador de Documento: {selectedDocument.type}
              </DialogTitle>
              <DialogDescription>
                Comprobante para el pago {selectedDocument.payment.id} al proveedor{' '}
                {selectedDocument.payment.supplierName}.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4">
               <Card>
                <CardContent className="p-4">
                    <div className="bg-muted/50 h-[500px] flex items-center justify-center rounded-md border-2 border-dashed">
                        <div className="text-center text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12" />
                            <p className="mt-2">Vista previa del documento no disponible.</p>
                            <p className="text-xs">Este es un marcador de posición.</p>
                        </div>
                    </div>
                </CardContent>
               </Card>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={handleCloseDialog}>
                Cerrar
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Descargar Documento
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}
