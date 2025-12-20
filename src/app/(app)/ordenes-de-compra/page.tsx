
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Eye,
  ListFilter,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Helper function to convert ERP currency names to ISO codes
const getCurrencyCode = (erpCurrency: string): string => {
  const currencyMap: Record<string, string> = {
    'Pesos': 'MXN',
    'Dolares': 'USD',
    'Dólares': 'USD',
    'Euros': 'EUR',
    'MXN': 'MXN',
    'USD': 'USD',
    'EUR': 'EUR',
  };
  return currencyMap[erpCurrency] || 'MXN';
};

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
  const [supplier, setSupplier] = useState('todos');
  const [empresa, setEmpresa] = useState('todas');
  const [orderNumber, setOrderNumber] = useState('');
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const [empresasUnicas, setEmpresasUnicas] = useState<string[]>([]);

  useEffect(() => {
    if (session) {
      cargarOrdenes();
    }
  }, [session]);

  const cargarOrdenes = async () => {
    if (!session) return;

    setLoading(true);
    try {
      console.log('Cargando órdenes de compra PENDIENTES desde ERP...');
      const response = await fetch('/api/admin/ordenes');
      const result = await response.json();

      if (result.success) {
        console.log('Órdenes del ERP cargadas:', result.data);
        setOrdenes(result.data.ordenes || []);
        setEstadisticas(result.data.estadisticas || null);

        // Extraer proveedores únicos para el filtro
        const proveedores = [...new Set(result.data.ordenes.map((o: any) => o.nombreProveedor || o.proveedor))].filter(Boolean) as string[];
        setProveedoresUnicos(proveedores);

        // Extraer empresas únicas para el filtro
        const empresas = [...new Set(result.data.ordenes.map((o: any) => o.empresa))].filter(Boolean) as string[];
        setEmpresasUnicas(empresas);
      } else {
        console.error('Error cargando órdenes:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return ordenes.filter((order) => {
      const orderDate = order.fechaEmision ? new Date(order.fechaEmision) : null;

      const dateFilter = !dateRange?.from || !orderDate || (orderDate >= dateRange.from && (!dateRange.to || orderDate <= dateRange.to));
      const supplierFilter = supplier === 'todos' || order.nombreProveedor === supplier || order.proveedor === supplier;
      const empresaFilter = empresa === 'todas' || order.empresa === empresa;
      const orderNumberFilter = !orderNumber ||
        order.movID?.toLowerCase().includes(orderNumber.toLowerCase()) ||
        order.concepto?.toLowerCase().includes(orderNumber.toLowerCase()) ||
        order.proveedor?.toLowerCase().includes(orderNumber.toLowerCase()) ||
        order.nombreProveedor?.toLowerCase().includes(orderNumber.toLowerCase());

      return dateFilter && supplierFilter && empresaFilter && orderNumberFilter;
    });
  }, [ordenes, dateRange, supplier, empresa, orderNumber]);

  const clearFilters = () => {
    setDateRange(undefined);
    setSupplier('todos');
    setEmpresa('todas');
    setOrderNumber('');
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8" suppressHydrationWarning>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Órdenes de Compra Pendientes</h1>
            <p className="text-muted-foreground">
              Consulte todas las órdenes de compra pendientes de todas las empresas.
            </p>
          </div>
          <Button variant="outline" onClick={cargarOrdenes} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        {/* Estadísticas rápidas */}
        {estadisticas && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Órdenes</CardDescription>
                <CardTitle className="text-2xl">{estadisticas.totalOrdenes}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Importe Total</CardDescription>
                <CardTitle className="text-2xl">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(estadisticas.totalImporte || 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Impuestos</CardDescription>
                <CardTitle className="text-2xl">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(estadisticas.totalImpuestos || 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total General</CardDescription>
                <CardTitle className="text-2xl">
                  {new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(estadisticas.totalGeneral || 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filtros de Búsqueda</CardTitle>
            <CardDescription>
              Refine los resultados de las órdenes de compra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <Select value={empresa} onValueChange={setEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las empresas</SelectItem>
                  {empresasUnicas.map((emp) => (
                    <SelectItem key={emp} value={emp}>
                      Empresa {emp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proveedores</SelectItem>
                  {proveedoresUnicos.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar por folio, concepto o proveedor..."
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <Button variant="outline" onClick={clearFilters}>
                <ListFilter className="mr-2 h-4 w-4" />
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
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
                    ? 'No hay órdenes de compra registradas con el estatus seleccionado.'
                    : 'No hay órdenes que coincidan con los filtros aplicados.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
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
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/ordenes-de-compra/${order.id}`}
                            className="hover:underline"
                          >
                            {order.movID || order.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.empresa}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.nombreProveedor || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{order.proveedor}</div>
                          </div>
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
                          <span className="text-sm text-muted-foreground">{order.situacion || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: getCurrencyCode(order.moneda),
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
                              <Link href={`/ordenes-de-compra/${order.id}`}>
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
          {!loading && filteredOrders.length > 0 && (
            <CardFooter className="text-sm text-muted-foreground">
              Mostrando {filteredOrders.length} de {ordenes.length} órdenes
            </CardFooter>
          )}
        </Card>
    </main>
  );
}
