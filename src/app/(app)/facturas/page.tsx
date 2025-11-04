
'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ListFilter, Search, Eye, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { invoices, suppliers } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getBadgeVariant = (status: Invoice['status']) => {
  switch (status) {
    case 'Pendiente pago':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/30';
    case 'En Revisión':
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30';
    case 'Rechazada':
      return 'bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/30';
    case 'Pagada':
      return 'bg-green-500/20 text-green-200 border-green-500/30 hover:bg-green-500/30';
    default:
      return 'secondary';
  }
};

export default function FacturasPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState('todas');
  const [supplier, setSupplier] = useState('todos');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.entryDate.split('/').reverse().join('-'));
      
      const dateFilter = !dateRange?.from || (invoiceDate >= dateRange.from && (!dateRange.to || invoiceDate <= dateRange.to));
      const statusFilter = status === 'todas' || invoice.status.toLowerCase().replace(' ', '-') === status;
      const supplierFilter = supplier === 'todos' || invoice.supplierName === suppliers.find(s => s.id === supplier)?.name;
      const invoiceNumberFilter = invoice.invoiceNumber.toLowerCase().includes(invoiceNumber.toLowerCase());

      return dateFilter && statusFilter && supplierFilter && invoiceNumberFilter;
    });
  }, [dateRange, status, supplier, invoiceNumber]);

  const handleReviewClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedInvoice(null);
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setStatus('todas');
    setSupplier('todos');
    setInvoiceNumber('');
  };

  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-2">
        <h1 className="text-3xl font-semibold">Gestión de Facturas</h1>
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <CardDescription>
              Refine los resultados de las facturas.
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
                  <SelectItem value="en-revision">En Revisión</SelectItem>
                  <SelectItem value="pendiente-pago">Pendiente pago</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="todos">Todos los proveedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Número de Factura"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Orden de Compra</TableHead>
                <TableHead>No. Factura</TableHead>
                <TableHead>Fecha de Entrada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.supplierName}
                  </TableCell>
                  <TableCell>
                     <div className="flex flex-col gap-1">
                        {invoice.purchaseOrderIds.map(orderId => (
                            <Link
                                key={orderId}
                                href={`/ordenes-de-compra/${orderId}`}
                                className="hover:underline text-blue-400"
                            >
                                {orderId}
                            </Link>
                        ))}
                      </div>
                  </TableCell>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.entryDate}</TableCell>
                  <TableCell>
                    <Badge className={cn(getBadgeVariant(invoice.status))}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(invoice.amount)}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <DialogTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReviewClick(invoice)}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver/Revisar Factura</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver/Revisar Factura</p>
                        </TooltipContent>
                      </Tooltip>
                    </DialogTrigger>
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileDown className="h-4 w-4" />
                            <span className="sr-only">Descargar PDF</span>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descargar PDF</p>
                      </TooltipContent>
                    </Tooltip>
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileDown className="h-4 w-4" />
                            <span className="sr-only">Descargar XML</span>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descargar XML</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </TooltipProvider>
          {selectedInvoice && (
            <DialogContent className="max-w-4xl grid-rows-[auto_1fr_auto]">
              <DialogHeader>
                <DialogTitle>
                  Revisión de Factura: {selectedInvoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  Proveedor: {selectedInvoice.supplierName} | Órdenes de Compra:{' '}
                  {selectedInvoice.purchaseOrderIds.map((orderId, index) => (
                    <React.Fragment key={orderId}>
                      <Link
                        href={`/ordenes-de-compra/${orderId}`}
                        className="hover:underline text-blue-400"
                      >
                        {orderId}
                      </Link>
                      {index < selectedInvoice.purchaseOrderIds.length - 1 && ', '}
                    </React.Fragment>
                  ))}
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] p-1">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Visualizador de PDF</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted h-96 flex items-center justify-center rounded-md">
                        <p className="text-muted-foreground">
                          Vista previa del PDF no disponible.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Datos del XML</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p>
                        <span className="font-semibold">RFC Emisor:</span>{' '}
                        {
                          suppliers.find(
                            (s) => s.name === selectedInvoice.supplierName
                          )?.taxId
                        }
                      </p>
                      <p>
                        <span className="font-semibold">RFC Receptor:</span>{' '}
                        GMS850101ABC
                      </p>
                      <p>
                        <span className="font-semibold">
                          Folio Fiscal (UUID):
                        </span>{' '}
                        5AB7C8-1234-5678-90AB-CDEF12345678
                      </p>
                      <p>
                        <span className="font-semibold">Subtotal:</span>{' '}
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                        }).format(selectedInvoice.amount / 1.16)}
                      </p>
                      <p>
                        <span className="font-semibold">IVA (16%):</span>{' '}
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                        }).format(
                          selectedInvoice.amount - selectedInvoice.amount / 1.16
                        )}
                      </p>
                      <p>
                        <span className="font-semibold">Total:</span>{' '}
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                        }).format(selectedInvoice.amount)}
                      </p>
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
                        <p className="text-sm text-green-200">
                          RFC del emisor coincide
                        </p>
                        <span className="text-green-400">✔</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-md">
                        <p className="text-sm text-green-200">
                          Monto total coincide con la OC
                        </p>
                        <span className="text-green-400">✔</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-md">
                        <p className="text-sm text-red-200">
                          Conceptos no coinciden
                        </p>
                        <span className="text-red-400">✖</span>
                      </div>
                    </CardContent>
                  </Card>
                   {selectedInvoice.status === 'En Revisión' && (
                    <Card>
                        <CardHeader>
                        <CardTitle>Acciones de Revisión</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rejectionReason">
                            Motivo de Rechazo (si aplica)
                            </Label>
                            <Textarea
                            id="rejectionReason"
                            placeholder="Describe el motivo del rechazo..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="observations">
                            Observaciones Adicionales
                            </Label>
                            <Textarea
                            id="observations"
                            placeholder="Añade tus observaciones aquí..."
                            />
                        </div>
                        </CardContent>
                    </Card>
                    )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                 <Button variant="outline" onClick={handleDialogClose}>
                    {selectedInvoice.status === 'En Revisión' ? 'Cancelar' : 'Cerrar'}
                </Button>
                {selectedInvoice.status === 'En Revisión' && (
                  <>
                    <Button variant="destructive" onClick={handleDialogClose}>
                      Rechazar con Motivo
                    </Button>
                    <Button variant="outline" onClick={handleDialogClose}>
                      Solicitar Corrección
                    </Button>
                    <Button type="submit" onClick={handleDialogClose}>
                      Aprobar Factura
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </main>
  );
}
