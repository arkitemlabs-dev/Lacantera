'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Copy, Search, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type InvoiceStatus = 'En revisión' | 'Pagada' | 'Aprobada' | 'Rechazada';

const kpis = [
  { title: 'En revisión', value: 1, color: 'text-yellow-400' },
  { title: 'Aprobada', value: 1, color: 'text-blue-400' },
  { title: 'Pagada', value: 1, color: 'text-green-400' },
  { title: 'Rechazada', value: 1, color: 'text-red-400' },
];

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
  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/proveedores/dashboard" className="hover:text-foreground">Inicio</Link>
        <span>&gt;</span>
        <span className="text-foreground">Facturación</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className={cn('text-sm font-medium', kpi.color)}>
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">factura(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/70">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Facturas</CardTitle>
              <CardDescription>
                Cargue y de seguimiento a sus facturas.
              </CardDescription>
            </div>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Subir Factura (PDF/XML)
            </Button>
          </div>
          <div className="mt-4 flex max-w-lg items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o número de orden..."
                className="pl-8"
              />
            </div>
            <Button type="submit">Buscar</Button>
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
              {invoices.map((invoice) => (
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
