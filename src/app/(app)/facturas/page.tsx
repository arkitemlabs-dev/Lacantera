
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, ListFilter, Eye, FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ITEMS_PER_PAGE = 10;

// Tipo para las facturas del API
interface FacturaAPI {
  id: number;
  numeroFactura: string;
  proveedor: string;
  proveedorNombre: string;
  proveedorRFC: string;
  ordenCompra: string;
  fechaEntrada: string;
  fechaEmision: string;
  estado: string;
  monto: number;
  saldo: number;
  empresa: string;
  uuid: string;
  serie: string;
  urlPDF: string;
  urlXML: string;
}

type InvoiceStatus = 'Pendiente pago' | 'En Revisión' | 'Rechazada' | 'Pagada';

const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'Pendiente pago':
      return 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/30 bg-blue-100 text-blue-800';
    case 'En Revisión':
      return 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800';
    case 'Rechazada':
      return 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 hover:bg-red-500/30 bg-red-100 text-red-800';
    case 'Pagada':
      return 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800';
    default:
      return 'secondary';
  }
};

export default function FacturasPage() {
  // Estado para datos del API
  const [facturas, setFacturas] = useState<FacturaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para el diálogo
  const [selectedInvoice, setSelectedInvoice] = useState<FacturaAPI | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Estado para filtros
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [status, setStatus] = useState('todas');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Estado para paginación del servidor
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Función para cargar facturas desde el API
  const fetchFacturas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', ITEMS_PER_PAGE.toString());

      if (status && status !== 'todas') {
        params.set('estatus', status);
      }
      if (invoiceNumber) {
        params.set('numeroFactura', invoiceNumber);
      }
      if (dateRange?.from) {
        params.set('fecha_desde', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.set('fecha_hasta', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/admin/facturas?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setFacturas(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.total);
      } else {
        setError(data.error || 'Error al cargar facturas');
      }
    } catch (err) {
      console.error('Error fetching facturas:', err);
      setError('Error de conexión al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, status, invoiceNumber, dateRange]);

  // Cargar facturas cuando cambian los filtros o la página
  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [status, invoiceNumber, dateRange]);

  const handleReviewClick = (invoice: FacturaAPI) => {
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
    setInvoiceNumber('');
    setCurrentPage(1);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando facturas...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" className="ml-4" onClick={fetchFacturas}>
                Reintentar
              </Button>
            </div>
          ) : facturas.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">No se encontraron facturas con los filtros seleccionados.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Orden de Compra</TableHead>
                <TableHead>Fecha de Entrada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.map((factura) => (
                <TableRow key={factura.id}>
                  <TableCell>{factura.numeroFactura}</TableCell>
                  <TableCell className="font-medium">
                    {factura.proveedorNombre}
                  </TableCell>
                  <TableCell>
                    {factura.ordenCompra && factura.ordenCompra !== '-' ? (
                      <Link
                        href={`/ordenes-de-compra/${factura.ordenCompra}`}
                        className="hover:underline text-blue-400"
                      >
                        {factura.ordenCompra}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(factura.fechaEntrada)}</TableCell>
                  <TableCell>
                    <Badge className={cn(getBadgeVariant(factura.estado))}>
                      {factura.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(factura.monto)}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <DialogTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReviewClick(factura)}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver/Revisar Factura</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver/Revisar Factura</p>
                        </TooltipContent>
                      </Tooltip>
                    </DialogTrigger>
                    {factura.urlPDF && (
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={factura.urlPDF} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-4 w-4" />
                              <span className="sr-only">Descargar PDF</span>
                            </a>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descargar PDF</p>
                      </TooltipContent>
                    </Tooltip>
                    )}
                    {factura.urlXML && (
                     <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={factura.urlXML} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-4 w-4" />
                              <span className="sr-only">Descargar XML</span>
                            </a>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Descargar XML</p>
                      </TooltipContent>
                    </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          </TooltipProvider>
          {totalRecords > 0 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)} de {totalRecords} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1 || loading}
                >
                  Primera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Siguiente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
          {selectedInvoice && (
            <DialogContent className="max-w-4xl grid-rows-[auto_1fr_auto]">
              <DialogHeader>
                <DialogTitle>
                  Revisión de Factura: {selectedInvoice.numeroFactura}
                </DialogTitle>
                <DialogDescription>
                  Proveedor: {selectedInvoice.proveedorNombre} | Orden de Compra:{' '}
                  {selectedInvoice.ordenCompra && selectedInvoice.ordenCompra !== '-' ? (
                    <Link
                      href={`/ordenes-de-compra/${selectedInvoice.ordenCompra}`}
                      className="hover:underline text-blue-400"
                    >
                      {selectedInvoice.ordenCompra}
                    </Link>
                  ) : (
                    'N/A'
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] p-1">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Visualizador de PDF</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedInvoice.urlPDF ? (
                        <iframe
                          src={selectedInvoice.urlPDF}
                          className="w-full h-96 rounded-md border"
                          title="Vista previa PDF"
                        />
                      ) : (
                        <div className="bg-muted h-96 flex items-center justify-center rounded-md">
                          <p className="text-muted-foreground">
                            Vista previa del PDF no disponible.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Datos de la Factura</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p>
                        <span className="font-semibold">RFC Emisor:</span>{' '}
                        {selectedInvoice.proveedorRFC || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Folio Fiscal (UUID):</span>{' '}
                        {selectedInvoice.uuid || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Serie:</span>{' '}
                        {selectedInvoice.serie || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Fecha de Emisión:</span>{' '}
                        {formatDate(selectedInvoice.fechaEmision)}
                      </p>
                      <p>
                        <span className="font-semibold">Total:</span>{' '}
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                        }).format(selectedInvoice.monto)}
                      </p>
                      <p>
                        <span className="font-semibold">Saldo:</span>{' '}
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: 'MXN',
                        }).format(selectedInvoice.saldo)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Estado de la Factura</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-md border">
                        <p className="text-sm font-medium">Estado actual:</p>
                        <Badge className={cn(getBadgeVariant(selectedInvoice.estado))}>
                          {selectedInvoice.estado}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-md border">
                        <p className="text-sm font-medium">Empresa:</p>
                        <span className="text-sm">{selectedInvoice.empresa}</span>
                      </div>
                      {selectedInvoice.ordenCompra && selectedInvoice.ordenCompra !== '-' && (
                        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-md">
                          <p className="text-sm dark:text-green-200 text-green-800">
                            Asociada a Orden de Compra
                          </p>
                          <span className="text-green-400">&#10004;</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className="flex gap-2">
                    {selectedInvoice.urlPDF && (
                      <Button variant="outline" className="flex-1" asChild>
                        <a href={selectedInvoice.urlPDF} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-2 h-4 w-4" />
                          Descargar PDF
                        </a>
                      </Button>
                    )}
                    {selectedInvoice.urlXML && (
                      <Button variant="outline" className="flex-1" asChild>
                        <a href={selectedInvoice.urlXML} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-2 h-4 w-4" />
                          Descargar XML
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                 <Button variant="outline" onClick={handleDialogClose}>
                    Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </main>
  );
}
