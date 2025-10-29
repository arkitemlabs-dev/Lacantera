'use client';
import { ChevronLeft, Eye, FileCheck, FileClock, FileX } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { purchaseOrders, suppliers } from '@/lib/data';
import type { PurchaseOrder } from '@/lib/types';
import { cn } from '@/lib/utils';

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) => (
  <div className="grid grid-cols-3 gap-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="col-span-2 font-medium">{value || '-'}</dd>
  </div>
);

const getStatusBadge = (status: PurchaseOrder['status']) => {
  switch (status) {
    case 'Pendiente':
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
    case 'Completa':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Cancelada':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
    case 'Atrasada':
      return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
  }
};

const items = [
    { id: 'ITEM-001', name: 'Material de oficina', quantity: 10, unitPrice: 150, total: 1500 },
    { id: 'ITEM-002', name: 'Sillas de oficina', quantity: 5, unitPrice: 800, total: 4000 },
];

export default function OrderProfilePage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = purchaseOrders.find((o) => o.id === params.orderId);

  if (!order) {
    notFound();
  }

  const supplier = suppliers.find(s => s.name === order.supplierName);

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/ordenes-de-compra">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className='flex-1'>
            <h1 className="text-3xl font-semibold">Orden de Compra: {order.id}</h1>
            <p className='text-muted-foreground'>{order.name}</p>
          </div>
           <Badge className={cn(getStatusBadge(order.status))}>{order.status}</Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Orden</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(item.total)}</TableCell>
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator className="my-4" />
                <div className="grid gap-2 text-right">
                    <div className="font-medium">Subtotal: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.amount / 1.16)}</div>
                    <div className="font-medium">IVA (16%): {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.amount - (order.amount / 1.16))}</div>
                    <div className="text-lg font-bold">Total: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.amount)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                 <CardDescription>
                    Detalles del proveedor y la solicitud.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                  <h3 className="text-md font-semibold mb-2">Proveedor</h3>
                  <div className="space-y-1">
                    <InfoRow label="Nombre" value={order.supplierName} />
                    {supplier && <InfoRow label="Contacto" value={supplier.contactName} />}
                  </div>
                </div>
                <Separator />
                 <div>
                  <h3 className="text-md font-semibold mb-2">Solicitud</h3>
                  <div className="space-y-1">
                    <InfoRow label="Área Solicitante" value={order.area} />
                    <InfoRow label="Usuario Creador" value={order.createdBy} />
                    <InfoRow label="Presupuesto" value={new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(order.budget)} />
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-md font-semibold mb-2">Fechas</h3>
                  <div className="space-y-1">
                    <InfoRow label="Fecha de Emisión" value={order.emissionDate} />
                    <InfoRow label="Fecha de Entrega" value={order.deliveryDate} />
                  </div>
                </div>
                <Separator />
                <Button className='w-full'>Aprobar Orden</Button>
                <Button variant='destructive' className='w-full'>Rechazar Orden</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
