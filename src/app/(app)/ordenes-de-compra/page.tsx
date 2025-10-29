'use client';

import Link from 'next/link';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Eye,
  FileDown,
} from 'lucide-react';
import { purchaseOrders } from '@/lib/data';
import type { PurchaseOrderStatus } from '@/lib/types';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
            <p className="text-muted-foreground">
              Consulte y gestione todas sus órdenes de compra.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="gap-1">
              <Link href="/ordenes-de-compra/nueva">
                <PlusCircle className="h-4 w-4" />
                Nueva Orden
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <FileDown className="h-4 w-4" />
              Descargar Reporte
            </Button>
          </div>
        </div>

        <Tabs defaultValue="todas">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="completas">Completas</TabsTrigger>
            <TabsTrigger value="atrasadas">Atrasadas</TabsTrigger>
            <TabsTrigger value="canceladas">Canceladas</TabsTrigger>
          </TabsList>
          <TabsContent value="todas">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Fecha Emisión</TableHead>
                      <TableHead>Estatus</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead>Área Compra</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/ordenes-de-compra/${order.id}`}
                            className="hover:underline"
                          >
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell>{order.name}</TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>{order.emissionDate}</TableCell>
                        <TableCell>
                          <Badge
                            variant={statusStyles[order.status].variant}
                            className={cn(statusStyles[order.status].className)}
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
                              <Link href={`/ordenes-de-compra/${order.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver Detalles</span>
                              </Link>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  aria-haspopup="true"
                                  size="icon"
                                  variant="ghost"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                <DropdownMenuItem>Cancelar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
