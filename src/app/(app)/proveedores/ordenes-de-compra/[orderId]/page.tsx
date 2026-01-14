'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Loader2, AlertCircle, Package } from 'lucide-react';
import Link from 'next/link';

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

export default function OrderProfilePage({
  params,
}: {
  params: { orderId: string };
}) {
  const { data: session } = useSession();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarOrden();
  }, [session, params.orderId]);

  const cargarOrden = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Cargando detalle de orden:', params.orderId);

      // Llamar al endpoint de detalle específico
      const response = await fetch(`/api/proveedor/ordenes/${params.orderId}`);
      const result = await response.json();

      if (result.success) {
        console.log('✅ Orden cargada:', result.data);
        setOrder(result.data.orden);
      } else {
        setError(result.error || 'Error cargando la orden');
        console.error('❌ Error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando orden de compra...</span>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Orden no encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'No se pudo encontrar la orden de compra solicitada.'}
          </p>
          <Button asChild variant="outline">
            <Link href="/proveedores/ordenes-de-compra">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Volver a Órdenes de Compra
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const statusStyle = statusStyles[order.estatus] || statusStyles['PENDIENTE'];

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/proveedores/ordenes-de-compra">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className='flex-1'>
            <h1 className="text-3xl font-semibold">Orden de Compra: {order.movID || order.id}</h1>
            <p className='text-muted-foreground'>{order.concepto || 'Sin concepto'}</p>
          </div>
           <Badge
             variant={statusStyle.variant}
             className={cn('font-normal', statusStyle.className)}
           >
             {order.estatus}
           </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Partidas de la Orden
                </CardTitle>
                <CardDescription>
                  {order.partidas?.length || 0} partida(s) en esta orden
                </CardDescription>
              </CardHeader>
              <CardContent>
                {order.partidas && order.partidas.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Renglón</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Artículo / SubCuenta</TableHead>
                          <TableHead className="text-center">Unidad</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Costo</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.partidas.map((partida: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-center">{partida.renglon}</TableCell>
                            <TableCell>
                              <div className="font-mono text-xs">{partida.codigo || 'N/A'}</div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {partida.articulo && (
                                  <div className="font-medium">{partida.articulo}</div>
                                )}
                                {partida.subCuenta && (
                                  <div className="text-xs text-muted-foreground">{partida.subCuenta}</div>
                                )}
                                {!partida.articulo && !partida.subCuenta && (
                                  <div className="text-muted-foreground">N/A</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs text-muted-foreground">{partida.unidad || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('es-MX', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 4,
                              }).format(partida.cantidad || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat('es-MX', {
                                style: 'currency',
                                currency: order.moneda || 'MXN',
                              }).format(partida.costo || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {new Intl.NumberFormat('es-MX', {
                                style: 'currency',
                                currency: order.moneda || 'MXN',
                              }).format(partida.subtotal || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Separator className="my-4" />
                    <div className="grid gap-2 text-right">
                      <div className="flex justify-end items-center gap-4">
                        <span className="text-muted-foreground">Importe:</span>
                        <span className="font-medium w-32">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: order.moneda || 'MXN',
                          }).format(order.importe || 0)}
                        </span>
                      </div>
                      <div className="flex justify-end items-center gap-4">
                        <span className="text-muted-foreground">Impuestos:</span>
                        <span className="font-medium w-32">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: order.moneda || 'MXN',
                          }).format(order.impuestos || 0)}
                        </span>
                      </div>
                      {order.descuentoLineal > 0 && (
                        <div className="flex justify-end items-center gap-4">
                          <span className="text-muted-foreground">Descuento:</span>
                          <span className="font-medium text-green-600 w-32">
                            -{new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: order.moneda || 'MXN',
                            }).format(order.descuentoLineal || 0)}
                          </span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-end items-center gap-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-lg font-bold w-32">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: order.moneda || 'MXN',
                          }).format(order.total || 0)}
                        </span>
                      </div>
                      {order.saldo > 0 && (
                        <div className="flex justify-end items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Saldo pendiente:</span>
                          <span className="text-muted-foreground w-32">
                            {new Intl.NumberFormat('es-MX', {
                              style: 'currency',
                              currency: order.moneda || 'MXN',
                            }).format(order.saldo || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay partidas registradas para esta orden
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                 <CardDescription>
                    Detalles de la orden de compra
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div>
                  <h3 className="text-md font-semibold mb-2">Orden</h3>
                  <div className="space-y-1">
                    <InfoRow label="Folio" value={order.movID || order.id} />
                    <InfoRow label="Empresa" value={order.empresa} />
                    <InfoRow label="Proveedor" value={order.nombreProveedor} />
                    <InfoRow label="RFC" value={order.rfc} />
                  </div>
                </div>
                <Separator />
                 <div>
                  <h3 className="text-md font-semibold mb-2">Estado</h3>
                  <div className="space-y-1">
                    <InfoRow label="Estatus" value={order.estatus} />
                    <InfoRow label="Situación" value={order.situacion || 'N/A'} />
                    {order.situacionNota && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Nota:</span>
                        <p className="font-medium mt-1">{order.situacionNota}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-md font-semibold mb-2">Fechas</h3>
                  <div className="space-y-1">
                    <InfoRow
                      label="Fecha Emisión"
                      value={
                        order.fechaEmision
                          ? new Date(order.fechaEmision).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'
                      }
                    />
                    <InfoRow
                      label="Fecha Requerida"
                      value={
                        order.fechaRequerida
                          ? new Date(order.fechaRequerida).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'
                      }
                    />
                    <InfoRow
                      label="Fecha Entrega"
                      value={
                        order.fechaEntrega
                          ? new Date(order.fechaEntrega).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'
                      }
                    />
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-md font-semibold mb-2">Detalles Adicionales</h3>
                  <div className="space-y-1">
                    <InfoRow label="Proyecto" value={order.proyecto || 'N/A'} />
                    <InfoRow label="Almacén" value={order.almacen || 'N/A'} />
                    <InfoRow label="Condición" value={order.condicion || 'N/A'} />
                    <InfoRow label="Referencia" value={order.referencia || 'N/A'} />
                    <InfoRow label="Prioridad" value={order.prioridad || 'N/A'} />
                    <InfoRow label="Moneda" value={order.moneda || 'MXN'} />
                    {order.tipoCambio && order.tipoCambio !== 1 && (
                      <InfoRow label="Tipo Cambio" value={order.tipoCambio} />
                    )}
                    {order.observaciones && (
                      <div className="text-sm mt-2">
                        <span className="text-muted-foreground">Observaciones:</span>
                        <p className="font-medium mt-1">{order.observaciones}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
