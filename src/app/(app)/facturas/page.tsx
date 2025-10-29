
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ListFilter, Search } from 'lucide-react';
import { format } from 'date-fns';

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


const getBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
        case 'Aprobada':
            return 'bg-green-500/20 text-green-200 border-green-500/30 hover:bg-green-500/30';
        case 'En Revisión':
            return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30';
        case 'Rechazada':
            return 'bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/30';
        case 'Pagada':
            return 'bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/30';
        default:
            return 'secondary';
    }
}


export default function FacturasPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleApproveClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDate(undefined);
    setIsDialogOpen(true);
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedInvoice(null);
  }

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
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !paymentDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "PPP") : <span>Rango de Fechas</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={setPaymentDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
              </div>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="en-revision">En Revisión</SelectItem>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                </SelectContent>
              </Select>
               <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                    {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input placeholder="Número de Factura" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" />
                Limpiar Filtros
            </Button>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </CardFooter>
        </Card>

         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.supplierName}</TableCell>
                        <TableCell>
                            <Link href={`/ordenes-de-compra/${invoice.purchaseOrderId}`} className="hover:underline text-blue-400">
                                {invoice.purchaseOrderId}
                            </Link>
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
                        <TableCell className="text-center">
                        {invoice.actionable && (
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleApproveClick(invoice)}>
                                    Aprobar
                                </Button>
                            </DialogTrigger>
                        )}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
            {selectedInvoice && (
              <DialogContent className="max-w-4xl grid-rows-[auto_1fr_auto]">
                <DialogHeader>
                  <DialogTitle>Revisión de Factura: {selectedInvoice.invoiceNumber}</DialogTitle>
                  <DialogDescription>
                    Proveedor: {selectedInvoice.supplierName} | Orden de Compra: {' '}
                     <Link href={`/ordenes-de-compra/${selectedInvoice.purchaseOrderId}`} className="hover:underline text-blue-400">
                        {selectedInvoice.purchaseOrderId}
                    </Link>
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
                                    <p className="text-muted-foreground">Vista previa del PDF no disponible.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <CardTitle>Datos del XML</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs space-y-2">
                                <p><span className="font-semibold">RFC Emisor:</span> {suppliers.find(s => s.name === selectedInvoice.supplierName)?.taxId}</p>
                                <p><span className="font-semibold">RFC Receptor:</span> GMS850101ABC</p>
                                <p><span className="font-semibold">Folio Fiscal (UUID):</span> 5AB7C8-1234-5678-90AB-CDEF12345678</p>
                                <p><span className="font-semibold">Subtotal:</span> {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedInvoice.amount / 1.16)}</p>
                                <p><span className="font-semibold">IVA (16%):</span> {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedInvoice.amount - (selectedInvoice.amount / 1.16))}</p>
                                <p><span className="font-semibold">Total:</span> {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(selectedInvoice.amount)}</p>
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
                                    <p className="text-sm text-green-200">RFC del emisor coincide</p>
                                    <span className="text-green-400">✔</span>
                                </div>
                                 <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-md">
                                    <p className="text-sm text-green-200">Monto total coincide con la OC</p>
                                    <span className="text-green-400">✔</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-md">
                                    <p className="text-sm text-red-200">Conceptos no coinciden</p>
                                    <span className="text-red-400">✖</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Acciones</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="space-y-2">
                                     <Label htmlFor="rejectionReason">Motivo de Rechazo (si aplica)</Label>
                                     <Textarea id="rejectionReason" placeholder="Describe el motivo del rechazo..." />
                                 </div>
                                  <div className="space-y-2">
                                     <Label htmlFor="observations">Observaciones Adicionales</Label>
                                     <Textarea id="observations" placeholder="Añade tus observaciones aquí..." />
                                 </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={handleDialogClose}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleDialogClose}>Rechazar con Motivo</Button>
                   <Button variant="outline" onClick={handleDialogClose}>Solicitar Corrección</Button>
                  <Button type="submit" onClick={handleDialogClose}>Aprobar Factura</Button>
                </DialogFooter>
              </DialogContent>
            )}
        </Dialog>
      </div>
    </main>
  );
}
