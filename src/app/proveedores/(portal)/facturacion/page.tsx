
'use client';

import { useState } from 'react';
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
import { Eye, Search, Upload, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { purchaseOrders } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


type InvoiceStatus = 'En revisión' | 'Pagada' | 'Pendiente pago' | 'Rechazada';

const invoices = [
  {
    folio: 'A-5832',
    cfdi: 'F-XYZ-123',
    ordenesAsociadas: ['OC-127', 'OC-128'],
    fechaEmision: '2024-07-19',
    estado: 'En revisión',
    monto: 8500.5,
    empresa: 'La Cantera Desarrollos Mineros',
  },
  {
    folio: 'A-5831',
    cfdi: 'F-ABC-456',
    ordenesAsociadas: ['OC-124'],
    fechaEmision: '2024-07-11',
    estado: 'Pagada',
    monto: 3200.75,
    empresa: 'La Cantera Desarrollos Mineros',
  },
  {
    folio: 'A-5830',
    cfdi: 'F-DEF-789',
    ordenesAsociadas: ['OC-123'],
    fechaEmision: '2024-07-05',
    estado: 'Pendiente pago',
    monto: 12500.0,
    empresa: 'La Cantera Desarrollos Mineros',
  },
  {
    folio: 'A-5829',
    cfdi: 'F-GHI-012',
    ordenesAsociadas: ['OC-122'],
    fechaEmision: '2024-07-02',
    estado: 'Rechazada',
    monto: 1800.0,
    empresa: 'La Cantera Desarrollos Mineros',
  },
];

const getStatusBadgeClass = (status: InvoiceStatus) => {
  switch (status) {
    case 'En revisión':
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
    case 'Pagada':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Pendiente pago':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
    case 'Rechazada':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
    default:
      return 'secondary';
  }
};

export default function FacturacionProveedorPage() {
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  return (
    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
    <main className="flex-1 space-y-8 p-4 md:p-8">
       <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">
          Cargue y de seguimiento a sus facturas.
        </p>
      </div>

      <Card className="bg-card/70">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Facturas</CardTitle>
              <CardDescription>
                Cargue y de seguimiento a sus facturas.
              </CardDescription>
            </div>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Factura (PDF/XML)
                </Button>
            </DialogTrigger>
          </div>
          <div className="mt-4 flex max-w-lg items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o número de orden..."
                className="pl-8"
              />
            </div>
            <Button type="submit">Buscar</Button>
          </div>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>CFDI</TableHead>
                  <TableHead>Orden Asociada</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.folio}>
                    <TableCell className="font-medium">{invoice.folio}</TableCell>
                    <TableCell>{invoice.cfdi}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {invoice.ordenesAsociadas.length > 1 ? (
                          invoice.ordenesAsociadas.map(orderId => (
                             <Link key={orderId} href={`/proveedores/ordenes-de-compra/${orderId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">{orderId}</Badge>
                             </Link>
                          ))
                        ) : (
                          <Link href={`/proveedores/ordenes-de-compra/${invoice.ordenesAsociadas[0]}`} className="hover:underline text-blue-400">
                              {invoice.ordenesAsociadas[0]}
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.empresa}</TableCell>
                    <TableCell>{invoice.fechaEmision}</TableCell>
                    <TableCell>
                      <Badge className={cn('font-normal', getStatusBadgeClass(invoice.estado as InvoiceStatus))}>
                        {invoice.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(invoice.monto)}
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Upload className="h-4 w-4" />
                            <span className="sr-only">Subir</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Subir</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileDown className="h-4 w-4" />
                            <span className="sr-only">Descargar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Descargar</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir Nueva Factura</DialogTitle>
          <DialogDescription>
            Adjunte los archivos de su factura (PDF y XML) y asóciela a una o más órdenes de compra.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative border-2 border-dashed border-muted rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Arrastre sus archivos aquí o haga clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF y XML requeridos
            </p>
            <Input
              type="file"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="space-y-2">
            <Label>Asociar a Órdenes de Compra</Label>
            <ScrollArea className="h-40 rounded-md border p-2">
              <div className="space-y-2">
                {purchaseOrders
                  .filter((po) => po.status !== 'Cancelada' && po.status !== 'Completa')
                  .map((po) => (
                    <div key={po.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                      <Checkbox id={`po-${po.id}`} />
                      <Label htmlFor={`po-${po.id}`} className="flex flex-col flex-1 cursor-pointer">
                        <span className="font-medium">{po.id} - {po.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(po.amount)}
                        </span>
                      </Label>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
           <div className="space-y-2">
            <Label htmlFor="invoiceId">Folio de Factura</Label>
            <Input id="invoiceId" placeholder="Ej. A-5833" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancelar</Button>
          <Button onClick={() => setIsUploadDialogOpen(false)}>Subir y Enviar a Revisión</Button>
        </DialogFooter>
      </DialogContent>
    </main>
    </Dialog>
  );
}

    

    