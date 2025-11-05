
'use client';

import React, { useState, useMemo } from 'react';
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
  Upload,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Check,
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
import { payments, suppliers, invoices } from '@/lib/data';
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const getStatusVariant = (status: PaymentStatus) => {
  switch (status) {
    case 'Completo':
      return 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800';
    case 'Pendiente complemento':
      return 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800';
    case 'En Revisión':
        return 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 bg-blue-100 text-blue-800';
    case 'Rechazada':
        return 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 bg-red-100 text-red-800';
  }
};

const getComplementStatus = (payment: Payment) => {
    if (payment.status === 'Completo') {
        return { text: 'Recibido y Aprobado', icon: <ThumbsUp className="h-4 w-4 mr-2 text-green-400"/>, color: 'text-green-400' };
    }
    if (payment.status === 'Pendiente complemento') {
        return { text: 'Pendiente de Carga', icon: <Clock className="h-4 w-4 mr-2 text-yellow-400"/>, color: 'text-yellow-400' };
    }
    if (payment.status === 'En Revisión') {
        return { text: 'En Revisión', icon: <Eye className="h-4 w-4 mr-2 text-blue-400"/>, color: 'text-blue-400' };
    }
    if (payment.status === 'Rechazada') {
        return { text: 'Rechazado', icon: <ThumbsDown className="h-4 w-4 mr-2 text-red-400"/>, color: 'text-red-400' };
    }
    return { text: 'N/A', icon: null, color: 'text-muted-foreground' };
};


export default function PagosPage() {
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isComplementReviewOpen, setIsComplementReviewOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState('todas');
  const [supplier, setSupplier] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
        // Normalizing date for comparison. Assuming 'DD/MM/YYYY' format.
        const parts = payment.executionDate.split('/');
        const paymentDate = new Date(`${parts[2]}-${parts[1]}-${[parts[0]]}`);

        const dateFilter = !dateRange?.from || (paymentDate >= dateRange.from && (!dateRange.to || paymentDate <= dateRange.to));
        const statusFilter = status === 'todas' || payment.status.toLowerCase().replace(/ /g, '-') === status;
        const supplierFilter = supplier === 'todos' || payment.supplierName === suppliers.find(s => s.id === supplier)?.name;
        const searchFilter =
            payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.invoiceIds.some(id => id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            payment.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

        return dateFilter && statusFilter && supplierFilter && searchFilter;
    });
  }, [dateRange, status, supplier, searchTerm]);


  const handleOpenDetailDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailDialogOpen(true);
  };

   const handleOpenComplementDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsComplementReviewOpen(true);
  };


  const clearFilters = () => {
    setDateRange(undefined);
    setStatus('todas');
    setSupplier('todos');
    setSearchTerm('');
  };
  
  const InfoRow = ({ label, value, className }: { label: string, value: string | number, className?: string }) => (
    <div className="grid grid-cols-2 gap-2">
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className={cn("text-sm font-medium", className)}>{value}</dd>
    </div>
  );

  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <h1 className="text-3xl font-semibold">Pagos</h1>
      </div>

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
                    <SelectItem value="en-revision">En Revisión</SelectItem>
                    <SelectItem value="rechazada">Rechazada</SelectItem>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestión de Pagos</CardTitle>
                <CardDescription>
                    Busca y gestiona todos los pagos registrados en el sistema.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Pago</TableHead>
                    <TableHead>Factura(s)</TableHead>
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
                        <Button variant="link" className="p-0 h-auto" onClick={() => handleOpenDetailDialog(payment)}>
                            {payment.id}
                        </Button>
                      </TableCell>
                       <TableCell>
                        <div className="flex flex-col gap-1">
                            {payment.invoiceIds.map(invoiceId => (
                                <Link
                                    key={invoiceId}
                                    href={`/facturas?search=${invoiceId}`}
                                    className="hover:underline text-blue-400"
                                >
                                    {invoiceId}
                                </Link>
                            ))}
                        </div>
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
                        {payment.paymentReceipt ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="h-8">
                            <Upload className="h-3 w-3 mr-2" />
                            Subir
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        {payment.status === 'Completo' && (
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-400"/>
                                <Button variant="ghost" size="icon" className='h-8 w-8 bg-transparent hover:bg-primary/10'>
                                    <Download className="h-4 w-4" />
                                </Button>
                           </div>
                        )}
                        {payment.status === 'En Revisión' && (
                             <Button variant="ghost" size="icon" className='h-8 w-8' onClick={() => handleOpenComplementDialog(payment)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        )}
                         {(payment.status === 'Pendiente complemento' || payment.status === 'Rechazada') && (
                          <div className="flex items-center justify-center gap-2 opacity-50">
                                <Eye className="h-4 w-4"/>
                                <Download className="h-4 w-4" />
                           </div>
                        )}
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
          
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                {selectedPayment && (
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                    <DialogTitle>
                        Detalle del Pago: {selectedPayment.id}
                    </DialogTitle>
                    <DialogDescription>
                        Información detallada del pago y facturas asociadas.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Información General</h3>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <InfoRow label="ID Pago" value={selectedPayment.id} />
                            <InfoRow label="Proveedor" value={selectedPayment.supplierName} />
                            <InfoRow label="Monto" value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedPayment.amount)} />
                            <InfoRow label="Fecha Ejecución" value={selectedPayment.executionDate} />
                            <InfoRow label="Método" value={selectedPayment.method} />
                            <InfoRow label="Estado" value={selectedPayment.status} />
                            </div>
                        </div>
                        <Separator/>
                         <div className="space-y-4">
                            <h3 className="font-semibold">Facturas Asociadas</h3>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Factura</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedPayment.invoiceIds.map(invoiceId => {
                                            const invoice = invoices.find(inv => inv.invoiceNumber === invoiceId);
                                            return (
                                                <TableRow key={invoiceId}>
                                                    <TableCell className="font-medium">{invoiceId}</TableCell>
                                                    <TableCell className="text-right">{invoice ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(invoice.amount) : 'N/A'}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <Separator/>
                        <div className="space-y-4">
                            <h3 className="font-semibold">Complemento de Pago</h3>
                            <div className="flex items-center">
                                {getComplementStatus(selectedPayment).icon}
                                <span className={cn('font-medium', getComplementStatus(selectedPayment).color)}>
                                    {getComplementStatus(selectedPayment).text}
                                </span>
                                {selectedPayment.paymentComplement && (
                                    <Button variant="outline" size="sm" className="ml-auto">
                                        <Download className="h-4 w-4 mr-2"/>
                                        Descargar Archivos
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                        Cerrar
                    </Button>
                    </DialogFooter>
                </DialogContent>
                )}
            </Dialog>

            <Dialog open={isComplementReviewOpen} onOpenChange={setIsComplementReviewOpen}>
                {selectedPayment && (
                     <DialogContent className="max-w-4xl grid-rows-[auto_1fr_auto]">
                        <DialogHeader>
                            <DialogTitle>Revisión de Complemento de Pago</DialogTitle>
                            <DialogDescription>
                            Revise y valide el complemento de pago para: {selectedPayment.id}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] p-1">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Visualizador de Documento</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                    <div className="bg-muted h-96 flex items-center justify-center rounded-md">
                                        <p className="text-muted-foreground">
                                        Vista previa del documento no disponible.
                                        </p>
                                    </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Validaciones Automáticas</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-md">
                                            <p className="text-sm dark:text-green-200 text-green-800">UUID coincide con factura</p>
                                            <Check className="h-5 w-5 text-green-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Acciones de Revisión</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="rejectionReason">Motivo de Rechazo (si aplica)</Label>
                                            <Textarea id="rejectionReason" placeholder="Describe el motivo del rechazo..."/>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="ghost" onClick={() => setIsComplementReviewOpen(false)}>Cancelar</Button>
                            <Button variant="destructive" onClick={() => setIsComplementReviewOpen(false)}>Rechazar</Button>
                            <Button onClick={() => setIsComplementReviewOpen(false)}>Aprobar Complemento</Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

        </div>
    </main>
  );
}

    