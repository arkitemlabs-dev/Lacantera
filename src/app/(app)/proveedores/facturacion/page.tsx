
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Eye, Download, Search, Upload, ListFilter, Calendar as CalendarIcon } from 'lucide-react';
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

type InvoiceStatus = 'En revisión' | 'Pagada' | 'Aprobada' | 'Rechazada';

const invoices = [
  {
    folio: 'A-5832',
    cfdi: 'F-XYZ-123',
    ordenAsociada: 'OC-127',
    fechaEmision: '2024-07-19',
    estado: 'En revisión',
    monto: 8500.5,
  },
  {
    folio: 'A-5831',
    cfdi: 'F-ABC-456',
    ordenAsociada: 'OC-124',
    fechaEmision: '2024-07-11',
    estado: 'Pagada',
    monto: 3200.75,
  },
  {
    folio: 'A-5830',
    cfdi: 'F-DEF-789',
    ordenAsociada: 'OC-123',
    fechaEmision: '2024-07-05',
    estado: 'Aprobada',
    monto: 12500.0,
  },
  {
    folio: 'A-5829',
    cfdi: 'F-GHI-012',
    ordenAsociada: 'OC-122',
    fechaEmision: '2024-07-02',
    estado: 'Rechazada',
    monto: 1800.0,
  },
];

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
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredInvoices = useMemo(() => {
      return invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.fechaEmision);

        const dateFilter = !dateRange?.from || (invoiceDate >= dateRange.from && (!dateRange.to || invoiceDate <= dateRange.to));
        const statusFilter = status === 'todas' || invoice.estado.toLowerCase().replace(' ', '-') === status;
        const searchTermFilter = invoice.folio.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.ordenAsociada.toLowerCase().includes(searchTerm.toLowerCase());

        return dateFilter && statusFilter && searchTermFilter;
      });
    }, [dateRange, status, searchTerm]);

    // Paginación
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

    // Reset página cuando cambian los filtros
    useEffect(() => {
      setCurrentPage(1);
    }, [dateRange, status, searchTerm]);

    const clearFilters = () => {
      setDateRange(undefined);
      setStatus('todas');
      setSearchTerm('');
    };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">Inicio</Link>
        <span>&gt;</span>
        <span className="text-foreground">Facturación</span>
      </div>

      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/proveedores/facturacion/subir">
            <Upload className="mr-2 h-4 w-4" />
            Subir Factura (PDF/XML)
          </Link>
        </Button>
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
              {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.folio}>
                  <TableCell className="font-medium">{invoice.folio}</TableCell>
                  <TableCell>{invoice.cfdi}</TableCell>
                  <TableCell>
                     <Link href={`/proveedores/ordenes-de-compra/${invoice.ordenAsociada}`} className="hover:underline text-blue-400">
                        {invoice.ordenAsociada}
                    </Link>
                  </TableCell>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Descargar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Descargar PDF/XML</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {/* Paginación */}
        {filteredInvoices.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} de {filteredInvoices.length} registros
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
                Página {currentPage} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
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
