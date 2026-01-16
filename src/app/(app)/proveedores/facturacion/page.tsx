
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Eye, Download, Upload, ListFilter, Calendar as CalendarIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type InvoiceStatus = 'En revisión' | 'Pagada' | 'Aprobada' | 'Rechazada';

interface Factura {
  id: number;
  folio: string;
  cfdi: string;
  serie?: string;
  empresa: string;
  empresaNombre: string;
  fechaEmision: string;
  moneda: string;
  tipoCambio: number;
  subtotal: number;
  impuestos: number;
  total: number;
  saldo: number;
  estado: InvoiceStatus;
  ordenAsociada: string;
  ordenCompraID?: number;
  referencia?: string;
  observaciones?: string;
  motivoRechazo?: string;
  urlPDF?: string;
  urlXML?: string;
  fechaRegistro?: string;
  fechaRevision?: string;
}

interface Estadisticas {
  totalFacturas: number;
  porEstatus: Record<string, number>;
  montoTotal: number;
  saldoTotal: number;
}

interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const getStatusBadgeClass = (status: InvoiceStatus) => {
  switch (status) {
    case 'En revisión':
      return 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800';
    case 'Pagada':
      return 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800';
    case 'Aprobada':
      return 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/30 bg-blue-100 text-blue-800';
    case 'Rechazada':
      return 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 hover:bg-red-500/30 bg-red-100 text-red-800';
    default:
      return 'secondary';
  }
};

export default function FacturacionProveedorPage() {
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
    const [paginacion, setPaginacion] = useState<Paginacion>({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Debounce para búsqueda
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 500);
      return () => clearTimeout(timer);
    }, [searchTerm]);

    // Función para cargar facturas
    const fetchFacturas = useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (dateRange?.from) {
          params.set('fecha_desde', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
          params.set('fecha_hasta', format(dateRange.to, 'yyyy-MM-dd'));
        }
        if (status !== 'todas') {
          params.set('estatus', status);
        }
        if (debouncedSearchTerm) {
          params.set('busqueda', debouncedSearchTerm);
        }
        params.set('page', currentPage.toString());
        params.set('limit', itemsPerPage.toString());

        const response = await fetch(`/api/proveedor/facturas?${params.toString()}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al cargar facturas');
        }

        setFacturas(result.data.facturas);
        setEstadisticas(result.data.estadisticas);
        setPaginacion(result.data.paginacion);

      } catch (err: any) {
        console.error('Error cargando facturas:', err);
        setError(err.message || 'Error al cargar facturas');
        setFacturas([]);
      } finally {
        setLoading(false);
      }
    }, [dateRange, status, debouncedSearchTerm, currentPage, itemsPerPage]);

    // Cargar facturas al montar y cuando cambian los filtros
    useEffect(() => {
      fetchFacturas();
    }, [fetchFacturas]);

    // Reset página cuando cambian los filtros
    useEffect(() => {
      setCurrentPage(1);
    }, [dateRange, status, debouncedSearchTerm]);

    const clearFilters = () => {
      setDateRange(undefined);
      setStatus('todas');
      setSearchTerm('');
      setCurrentPage(1);
    };

    const formatCurrency = (amount: number, currency: string = 'MXN') => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return '-';
      try {
        return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
      } catch {
        return dateString;
      }
    };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">Inicio</Link>
        <span>&gt;</span>
        <span className="text-foreground">Facturación</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {estadisticas && (
            <p className="text-sm text-muted-foreground">
              Total: {estadisticas.totalFacturas} facturas | Monto: {formatCurrency(estadisticas.montoTotal)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFacturas} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/proveedores/facturacion/subir">
              <Upload className="mr-2 h-4 w-4" />
              Subir Factura (PDF/XML)
            </Link>
          </Button>
        </div>
      </div>

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
                        <SelectItem value="en-revision">En revisión</SelectItem>
                        <SelectItem value="aprobada">Aprobada</SelectItem>
                        <SelectItem value="pagada">Pagada</SelectItem>
                        <SelectItem value="rechazada">Rechazada</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Buscar por folio o número de orden..."
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/70">
        <CardHeader>
            <div>
              <CardTitle>Gestión de Facturas</CardTitle>
              <CardDescription>
                Cargue y de seguimiento a sus facturas.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando facturas...</span>
            </div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No se encontraron facturas con los filtros seleccionados.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>CFDI</TableHead>
                <TableHead>Orden Asociada</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturas.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.folio}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground" title={invoice.cfdi}>
                      {invoice.cfdi.length > 20 ? `${invoice.cfdi.substring(0, 20)}...` : invoice.cfdi}
                    </span>
                  </TableCell>
                  <TableCell>
                    {invoice.ordenCompraID ? (
                      <Link
                        href={`/proveedores/ordenes-de-compra/${invoice.ordenCompraID}`}
                        className="hover:underline text-blue-400"
                      >
                        {invoice.ordenAsociada}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{invoice.ordenAsociada}</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(invoice.fechaEmision)}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-normal', getStatusBadgeClass(invoice.estado))}>
                      {invoice.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.total, invoice.moneda)}
                  </TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver factura</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver factura</p>
                          </TooltipContent>
                        </Tooltip>
                        {invoice.urlPDF && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={invoice.urlPDF} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Descargar PDF</span>
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Descargar PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {invoice.urlXML && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                <a href={invoice.urlXML} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Descargar XML</span>
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Descargar XML</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {!invoice.urlPDF && !invoice.urlXML && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                <Download className="h-4 w-4 opacity-50" />
                                <span className="sr-only">Sin archivos</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sin archivos disponibles</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
        {/* Paginación */}
        {!loading && paginacion.total > 0 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {((paginacion.page - 1) * paginacion.limit) + 1}-{Math.min(paginacion.page * paginacion.limit, paginacion.total)} de {paginacion.total} registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Primera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Página {currentPage} de {paginacion.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= paginacion.totalPages}
              >
                Siguiente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(paginacion.totalPages)}
                disabled={currentPage >= paginacion.totalPages}
              >
                Última
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
