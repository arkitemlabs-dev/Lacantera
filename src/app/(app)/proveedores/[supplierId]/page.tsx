'use client';
import {
  ChevronLeft,
  FileCheck,
  FileClock,
  FileX,
  FileQuestion,
  Upload,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { suppliers } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { Supplier } from '@/lib/types';
import { notFound } from 'next/navigation';

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado' | 'vencido';

const documents = [
  {
    name: 'Constancia de Situación Fiscal (CSF)',
    status: 'aprobado' as DocStatus,
    date: '2024-07-15',
  },
  {
    name: 'Opinión de Cumplimiento SAT',
    status: 'pendiente' as DocStatus,
    date: null,
  },
  {
    name: 'Acta Constitutiva',
    status: 'aprobado' as DocStatus,
    date: '2023-01-20',
  },
  {
    name: 'Poder Notarial del Representante Legal',
    status: 'rechazado' as DocStatus,
    date: '2024-07-10',
  },
  {
    name: 'Póliza de Seguro de RC',
    status: 'vencido' as DocStatus,
    date: '2024-06-30',
  },
];

const docStatusConfig = {
  aprobado: {
    icon: <FileCheck className="h-5 w-5 text-green-500" />,
    label: 'Aprobado',
    variant: 'default',
    className: 'bg-green-500/20 text-green-200 border-green-500/30',
  },
  pendiente: {
    icon: <FileClock className="h-5 w-5 text-yellow-500" />,
    label: 'Pendiente',
    variant: 'secondary',
    className: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  },
  rechazado: {
    icon: <FileX className="h-5 w-5 text-red-500" />,
    label: 'Rechazado',
    variant: 'destructive',
    className: 'bg-red-500/20 text-red-200 border-red-500/30',
  },
  vencido: {
    icon: <FileQuestion className="h-5 w-5 text-orange-500" />,
    label: 'Vencido',
    variant: 'destructive',
    className: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
  },
};

const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="grid grid-cols-3 gap-2 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="col-span-2 font-medium">{value || '-'}</dd>
  </div>
);

export default function SupplierProfilePage({
  params,
}: {
  params: { supplierId: string };
}) {
  const supplier = suppliers.find((s) => s.id === params.supplierId);

  if (!supplier) {
    notFound();
  }

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/proveedores">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">{supplier.name}</h1>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="documentation">Documentación</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle>Información General del Proveedor</CardTitle>
                  <CardDescription>
                    Detalles fiscales, de contacto y estado de la cuenta.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Editar</Button>
                  <Button
                    variant={
                      supplier.status === 'active' ? 'destructive' : 'default'
                    }
                  >
                    {supplier.status === 'active'
                      ? 'Desactivar'
                      : 'Activar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Datos Fiscales */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Datos Fiscales</h3>
                  <div className="space-y-2">
                    <InfoRow label="Razón Social" value={supplier.name} />
                    <InfoRow label="RFC / Tax ID" value={supplier.taxId} />
                    <InfoRow
                      label="Dirección Fiscal"
                      value="Av. Siempre Viva 123, Springfield, USA"
                    />
                  </div>
                </div>
                <Separator />
                {/* Datos de Contacto */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                  <div className="space-y-2">
                    <InfoRow
                      label="Contacto Principal"
                      value={supplier.contactName}
                    />
                    <InfoRow
                      label="Email"
                      value={supplier.contactEmail}
                    />
                    <InfoRow label="Teléfono" value="+52 55 1234 5678" />
                  </div>
                </div>
                 <Separator />
                {/* Representante legal */}
                 <div>
                  <h3 className="text-lg font-semibold mb-4">Representante Legal</h3>
                  <div className="space-y-2">
                    <InfoRow
                      label="Nombre"
                      value="Lic. Homero Simpson"
                    />
                    <InfoRow
                      label="Email"
                      value="h.simpson@example.com"
                    />
                     <InfoRow
                      label="Teléfono"
                      value="+52 55 8765 4321"
                    />
                  </div>
                </div>
                <Separator />
                {/* Estado de la cuenta */}
                <div>
                   <h3 className="text-lg font-semibold mb-4">Estado de la Cuenta</h3>
                   <div className="space-y-2">
                     <InfoRow label="Código de Proveedor" value={`PROV-${supplier.id.padStart(3, '0')}`} />
                     <InfoRow label="Fecha de Registro" value={supplier.registrationDate} />
                     <div className="grid grid-cols-3 gap-2 text-sm items-center">
                        <dt className="text-muted-foreground">Estado Actual</dt>
                        <dd className="col-span-2">
                            <Badge variant={supplier.status === 'active' ? 'default' : 'destructive'} className={supplier.status === 'active' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}>
                                {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </dd>
                     </div>
                   </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documentation">
            <Card>
              <CardHeader>
                <CardTitle>Documentación</CardTitle>
                <CardDescription>
                  Gestione y valide los documentos del proveedor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Actualización</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc, index) => {
                      const config = docStatusConfig[doc.status];
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={config.variant}
                              className={cn('gap-1', config.className)}
                            >
                              {config.icon}
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{doc.date || 'N/A'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm">Ver</Button>
                             <Button variant="outline" size="sm">Aprobar</Button>
                             <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">Rechazar</Button>
                            <Button variant="link" size="sm">Solicitar Actualización</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
