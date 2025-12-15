
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Eye, FileDown, ListFilter, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusStyles: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }> = {
  'PENDIENTE': {
    variant: 'secondary',
    className:
      'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  'CONCLUIDO': {
    variant: 'default',
    className:
      'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800',
  },
  'CANCELADO': {
    variant: 'destructive',
    className:
      'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 hover:bg-red-500/30 bg-red-100 text-red-800',
  },
};

export default function OrdenesDeCompraPage() {
    const { data: session } = useSession();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [orderNumber, setOrderNumber] = useState('');
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [estadisticas, setEstadisticas] = useState<any>(null);

    useEffect(() => {
      cargarOrdenes();
    }, [session]);

    const cargarOrdenes = async () => {
      if (!session) return;

      setLoading(true);
      try {
        console.log('🔍 Cargando órdenes de compra desde ERP...');
        const response = await fetch('/api/proveedor/ordenes');
        const result = await response.json();

        if (result.success) {
          console.log('✅ Órdenes del ERP cargadas:', result.data);
          setOrdenes(result.data.ordenes || []);
          setEstadisticas(result.data.estadisticas || null);
        } else {
          console.error('❌ Error cargando órdenes:', result.error);
        }
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        setLoading(false);
      }
    };

    const filteredOrders = useMemo(() => {
      return ordenes.filter((order) => {
        const orderDate = order.fechaEmision ? new Date(order.fechaEmision) : null;

        const dateFilter = !dateRange?.from || !orderDate || (orderDate >= dateRange.from && (!dateRange.to || orderDate <= dateRange.to));
        const statusFilter = status === 'todas' || order.estatus?.toLowerCase() === status.toLowerCase();
        const orderNumberFilter = !orderNumber ||
          order.movID?.toLowerCase().includes(orderNumber.toLowerCase()) ||
          order.concepto?.toLowerCase().includes(orderNumber.toLowerCase());

        return dateFilter && statusFilter && orderNumberFilter;
      });
    }, [ordenes, dateRange, status, orderNumber]);
  
    const clearFilters = () => {
      setDateRange(undefined);
      setStatus('todas');
      setOrderNumber('');
    };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
    <div className="space-y-0.5">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra</h1>
            <p className="text-muted-foreground">
            Consulte y gestione todas sus órdenes de compra.
            </p>
        </div>
    </div>
    
     <Card>
        <CardHeader>
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <CardDescription>
                Refine los resultados de las órdenes de compra.
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
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="concluido">Concluido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
            </Select>
            <Input
                placeholder="Buscar por ID o nombre..."
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
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

    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando órdenes de compra...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron órdenes de compra</h3>
            <p className="text-sm text-muted-foreground">
              {ordenes.length === 0
                ? 'No tienes órdenes de compra registradas en el sistema.'
                : 'No hay órdenes que coincidan con los filtros aplicados.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead>Situación</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha Entrega</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const statusStyle = statusStyles[order.estatus] || statusStyles['PENDIENTE'];
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.movID || order.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.concepto || 'N/A'}</div>
                        {order.referencia && (
                          <div className="text-xs text-muted-foreground">Ref: {order.referencia}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.fechaEmision
                        ? new Date(order.fechaEmision).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusStyle.variant}
                        className={cn('font-normal', statusStyle.className)}
                      >
                        {order.estatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{order.situacion || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: order.moneda || 'MXN',
                      }).format(order.total || 0)}
                    </TableCell>
                    <TableCell>
                      {order.fechaEntrega
                        ? new Date(order.fechaEntrega).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{order.proyecto || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/proveedores/ordenes-de-compra/${order.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Detalles</span>
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </main>
  );
}
