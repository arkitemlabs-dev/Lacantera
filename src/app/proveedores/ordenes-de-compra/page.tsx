
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Eye,
  ListFilter,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { purchaseOrders } from '@/lib/data';
import type { PurchaseOrderStatus } from '@/lib/types';
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

const statusStyles: Record<
  PurchaseOrderStatus,
  { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className: string }
> = {
  Pendiente: {
    variant: 'secondary',
    className:
      'bg-yellow-500/20 text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/30',
  },
  Completa: {
    variant: 'default',
    className:
      'bg-green-500/20 text-green-200 border-green-500/30 hover:bg-green-500/30',
  },
  Atrasada: {
    variant: 'outline',
    className:
      'bg-blue-500/20 text-blue-200 border-blue-500/30 hover:bg-blue-500/30',
  },
  Cancelada: {
    variant: 'destructive',
    className:
      'bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/30',
  },
};

export default function OrdenesDeCompraPage() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [status, setStatus] = useState('todas');
    const [orderNumber, setOrderNumber] = useState('');
  
    const filteredOrders = useMemo(() => {
      return purchaseOrders.filter((order) => {
        const orderDate = new Date(order.emissionDate);
        
        const dateFilter = !dateRange?.from || (orderDate >= dateRange.from && (!dateRange.to || orderDate <= dateRange.to));
        const statusFilter = status === 'todas' || order.status.toLowerCase().replace(' ', '-') === status;
        const orderNumberFilter = order.id.toLowerCase().includes(orderNumber.toLowerCase());
  
        return dateFilter && statusFilter && orderNumberFilter;
      });
    }, [dateRange, status, orderNumber]);
  
    const clearFilters = () => {
      setDateRange(undefined);
      setStatus('todas');
      setOrderNumber('');
    };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
    <div className="space-y-0.5">
        <div className='flex justify-between items-center'>
            <div>
                 <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra</h1>
                <p className="text-muted-foreground">
                Consulte y gestione todas sus órdenes de compra.
                </p>
            </div>
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
                <SelectItem value="completa">Completa</SelectItem>
                <SelectItem value="atrasada">Atrasada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
            </Select>
            <Input
            placeholder="Número de Orden"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Área Compra</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead className="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  {order.id}
                </TableCell>
                <TableCell>{order.name}</TableCell>
                <TableCell>{new Date(order.emissionDate).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
                <TableCell>
                  <Badge
                    variant={statusStyles[order.status].variant}
                    className={cn('font-normal', statusStyles[order.status].className)}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                 <TableCell className="text-right">
                    {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                    }).format(order.amount)}
                 </TableCell>
                <TableCell>{order.deliveryDate}</TableCell>
                <TableCell>{order.area}</TableCell>
                <TableCell>{order.invoice || 'N/A'}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </main>
  );
}
