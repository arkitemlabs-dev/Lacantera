
'use client';

import { useState, useMemo } from 'react';
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
import { Eye, Copy, Search, Upload, ListFilter, Calendar as CalendarIcon } from 'lucide-react';
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
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
    case 'Pagada':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Aprobada':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
    case 'Rechazada':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
    default:
      return 'secondary';
  }
};

export default function FacturacionProveedorPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
  
    const filteredInvoices = useMemo(() => {
      return invoices.filter((invoice) => {
        const invoiceDate = new Date(invoice.fechaEmision);
        
        const dateFilter = !dateRange?.from || (invoiceDate >= dateRange.from && (!dateRange.to || invoiceDate <= dateRange.to));
        const statusFilter = status === 'todas' || invoice.estado.toLowerCase().replace(' ', '-') === status;
        const searchTermFilter = invoice.folio.toLowerCase().includes(searchTerm.toLowerCase()) || invoice.ordenAsociada.toLowerCase().includes(searchTerm.toLowerCase());
  
        return dateFilter && statusFilter && searchTermFilter;
      });
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
              {filteredInvoices.map((invoice) => (
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
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copiar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
