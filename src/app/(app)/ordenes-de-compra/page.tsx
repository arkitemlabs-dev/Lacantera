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
  ChevronLeft,
  ChevronRight,
  Search,
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

const ITEMS_PER_PAGE = 10;

// Estilos de estado según el alcance: Pendiente, Aceptada, Cancelada, Completa
const statusStyles: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string; className: string }> = {
  'PENDIENTE': {
    variant: 'secondary',
    label: 'Pendiente',
    className: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  'CONCLUIDO': {
    variant: 'default',
    label: 'Completa',
    className: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 hover:bg-green-500/30 bg-green-100 text-green-800',
  },
  'CANCELADO': {
    variant: 'destructive',
    label: 'Cancelada',
    className: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 hover:bg-red-500/30 bg-red-100 text-red-800',
  },
  'ACEPTADA': {
    variant: 'default',
    label: 'Aceptada',
    className: 'dark:bg-blue-500/20 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/30 bg-blue-100 text-blue-800',
  },
};

// Helper para obtener el estilo del estado
const getStatusStyle = (estatus: string) => {
  return statusStyles[estatus?.toUpperCase()] || statusStyles['PENDIENTE'];
};

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

export default function OrdenesDeCompraPage() {
  const { data: session } = useSession();

  // Estados de filtros
  const [estatus, setEstatus] = useState('todos');
  const [idOrden, setIdOrden] = useState('');
  const [proveedor, setProveedor] = useState('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Estados de datos
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proveedoresUnicos, setProveedoresUnicos] = useState<{ codigo: string; nombre: string }[]>([]);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [hayMasPaginas, setHayMasPaginas] = useState(false);

  // Cargar órdenes usando el Stored Procedure
  const cargarOrdenes = async () => {
    if (!session) return;

    setLoading(true);
    try {
      // Construir query params para el SP
      const params = new URLSearchParams();
      params.append('empresa', '01'); // Por ahora fijo, se puede hacer dinámico
      params.append('page', currentPage.toString());
      params.append('limit', '10');

      if (estatus !== 'todos') {
        params.append('estatus', estatus);
      }

      if (dateRange?.from) {
        params.append('fecha_desde', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('fecha_hasta', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/admin/ordenes-sp?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data || [];
        setOrdenes(data);

        // El SP devuelve el total en pagination.total
        const total = result.pagination?.total || 0;
        const paginas = result.pagination?.totalPages || 1;

        setTotalRegistros(total);
        setTotalPaginas(paginas);

        // Si el SP no devuelve total, inferir si hay más páginas
        // basándose en si recibimos exactamente el límite de registros
        if (total === 0 && data.length === ITEMS_PER_PAGE) {
          setHayMasPaginas(true);
        } else {
          setHayMasPaginas(false);
        }

        // Extraer proveedores únicos para el filtro
        const proveedoresMap = new Map<string, string>();
        data.forEach((o: any) => {
          if (o.Proveedor && !proveedoresMap.has(o.Proveedor)) {
            proveedoresMap.set(o.Proveedor, o.ProveedorNombre || o.Proveedor);
          }
        });

        const proveedoresList = Array.from(proveedoresMap.entries())
          .map(([codigo, nombre]) => ({ codigo, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setProveedoresUnicos(proveedoresList);
      } else {
        console.error('Error cargando órdenes:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar órdenes al iniciar y cuando cambian los filtros
  useEffect(() => {
    if (session) {
      cargarOrdenes();
    }
  }, [session, currentPage, estatus, dateRange]);

  // Filtro local por ID de orden y proveedor (búsqueda en tiempo real)
  const filteredOrders = useMemo(() => {
    return ordenes.filter((order) => {
      const idFilter = !idOrden ||
        order.MovID?.toLowerCase().includes(idOrden.toLowerCase()) ||
        order.ID?.toString().includes(idOrden);

      const proveedorFilter = proveedor === 'todos' ||
        order.Proveedor === proveedor;

      return idFilter && proveedorFilter;
    });
  }, [ordenes, idOrden, proveedor]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [estatus, proveedor, idOrden, dateRange]);

  const clearFilters = () => {
    setEstatus('todos');
    setIdOrden('');
    setProveedor('todos');
    setDateRange(undefined);
    setCurrentPage(1);
  };

  // La paginación viene del servidor, no hacer slice local
  // Solo usamos filteredOrders para filtros locales (ID, proveedor)
  const displayedOrders = filteredOrders;

  // Calcular total de páginas basado en el servidor
  // Si el SP devuelve total, usarlo; si no, inferir de hayMasPaginas
  const calcularTotalPaginas = () => {
    if (totalRegistros > 0) {
      return Math.ceil(totalRegistros / ITEMS_PER_PAGE);
    }
    // Si no hay total del servidor pero hay más páginas, permitir avanzar
    if (hayMasPaginas) {
      return currentPage + 1;
    }
    return currentPage;
  };

  const totalPaginasCalculado = calcularTotalPaginas();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
          <p className="text-muted-foreground">
            Gestione todas las órdenes de compra del sistema.
            {!loading && totalRegistros > 0 && (
              <span className="ml-2 font-medium text-foreground">
                ({totalRegistros} {totalRegistros === 1 ? 'registro' : 'registros'} en total)
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => cargarOrdenes()} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Filtros según el alcance: Estado, ID de orden, Proveedor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre las órdenes por estado, ID o proveedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Filtro por Estado */}
            <Select value={estatus} onValueChange={setEstatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="CONCLUIDO">Completa</SelectItem>
                <SelectItem value="CANCELADO">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por ID de Orden */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID de orden..."
                value={idOrden}
                onChange={(e) => setIdOrden(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro por Proveedor */}
            <Select value={proveedor} onValueChange={setProveedor}>
              <SelectTrigger>
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proveedores</SelectItem>
                {proveedoresUnicos.map((prov) => (
                  <SelectItem key={prov.codigo} value={prov.codigo}>
                    {prov.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Rango de Fechas */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yy', { locale: es })} -{' '}
                        {format(dateRange.to, 'dd/MM/yy', { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: es })
                    )
                  ) : (
                    <span>Rango de fechas</span>
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

            {/* Botón Limpiar Filtros */}
            <Button variant="outline" onClick={clearFilters}>
              <ListFilter className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Órdenes */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Cargando órdenes de compra...</span>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron órdenes</h3>
              <p className="text-sm text-muted-foreground">
                {ordenes.length === 0
                  ? 'No hay órdenes de compra registradas.'
                  : 'No hay órdenes que coincidan con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID de Orden</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha Emisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedOrders.map((order) => {
                  const statusStyle = getStatusStyle(order.Estatus);
                  return (
                    <TableRow key={order.ID}>
                      {/* ID de Orden */}
                      <TableCell className="font-medium">
                        <Link
                          href={`/ordenes-de-compra/${order.ID}`}
                          className="hover:underline text-primary"
                        >
                          {order.MovID || order.ID}
                        </Link>
                      </TableCell>

                      {/* Descripción/Concepto */}
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.Concepto || 'Sin descripción'}</div>
                          {order.Referencia && (
                            <div className="text-xs text-muted-foreground">Ref: {order.Referencia}</div>
                          )}
                        </div>
                      </TableCell>

                      {/* Proveedor */}
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.ProveedorNombre || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{order.Proveedor}</div>
                        </div>
                      </TableCell>

                      {/* Usuario que creó la orden */}
                      <TableCell>
                        <span className="text-sm">{order.Usuario || 'N/A'}</span>
                      </TableCell>

                      {/* Fecha de Emisión */}
                      <TableCell>
                        {order.FechaEmision
                          ? new Date(order.FechaEmision).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : 'N/A'}
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Badge
                          variant={statusStyle.variant}
                          className={statusStyle.className}
                        >
                          {statusStyle.label}
                        </Badge>
                      </TableCell>

                      {/* Total */}
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('es-MX', {
                          style: 'currency',
                          currency: getCurrencyCode(order.Moneda),
                        }).format((order.Importe || 0) + (order.Impuestos || 0))}
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link href={`/ordenes-de-compra/${order.ID}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Detalles</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Paginación */}
        {!loading && displayedOrders.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              {totalRegistros > 0 ? (
                <>
                  Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalRegistros)} de <strong>{totalRegistros.toLocaleString()}</strong> órdenes
                </>
              ) : (
                <>
                  Página {currentPage} - {displayedOrders.length} órdenes
                  {hayMasPaginas && <span className="ml-1">(hay más páginas)</span>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} {totalRegistros > 0 ? `de ${totalPaginasCalculado.toLocaleString()}` : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={totalRegistros > 0 ? currentPage >= totalPaginasCalculado : !hayMasPaginas}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
