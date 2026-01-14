
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
import {
  Eye,
  Search,
  Upload,
  FileArchive,
  FileCheck2,
  Download,
  ListFilter,
  Calendar as CalendarIcon,
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';


type PaymentStatus = 'Completado' | 'Pagado';

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
      return 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800';
    case 'Pagado':
      return 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800';
    default:
      return 'secondary';
  }
};

export default function PagosProveedorPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredPayments = useMemo(() => {
      return payments.filter((payment) => {
        const paymentDate = new Date(payment.date);

        const dateFilter = !dateRange?.from || (paymentDate >= dateRange.from && (!dateRange.to || paymentDate <= dateRange.to));
        const statusFilter = status === 'todas' || payment.status.toLowerCase() === status;
        const searchTermFilter = payment.invoice.toLowerCase().includes(searchTerm.toLowerCase());

        return dateFilter && statusFilter && searchTermFilter;
      });
    }, [dateRange, status, searchTerm]);

    // Paginación
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

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
        <Link href="/proveedores/dashboard" className="hover:text-foreground">
          Inicio
        </Link>
        <span>&gt;</span>
        <span className="text-foreground">Pagos</span>
      </div>

       <Card>
          <CardHeader>
              <CardTitle>Filtros de Búsqueda</CardTitle>
              <CardDescription>
                  Refine los resultados de los pagos.
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
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                      </SelectContent>
                  </Select>
                  <Input
                      placeholder="Buscar por ID de factura..."
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
          <CardTitle>Listado de Pagos</CardTitle>
          <CardDescription>
            Consulte el estado y los detalles de los pagos recibidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pago</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-center">Comprobante de pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Complemento de pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.map((payment) => (
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
                  <TableCell>{payment.method}</TableCell>
                  <TableCell className="text-center space-x-1">
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Descargar</span>
                    </Button>
                  </TableCell>
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
                    {payment.hasComplement ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver Complemento</span>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className='h-8'>
                        <Upload className="mr-2 h-3 w-3" />
                        Subir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {/* Paginación */}
        {filteredPayments.length > 0 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} de {filteredPayments.length} registros
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
