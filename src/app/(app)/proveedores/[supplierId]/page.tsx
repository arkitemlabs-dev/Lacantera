
'use client';
import {
  ChevronLeft,
  FileCheck,
  FileClock,
  FileX,
  FileQuestion,
  Eye,
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
import { suppliers } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { Supplier, SupplierType } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado' | 'vencido' | 'no aplica';

type Document = {
  name: string;
  status: DocStatus;
  date: string | null;
  types: SupplierType[];
  extraLabel?: string;
};

const allDocs: Document[] = [
    { name: 'Poder notarial del representante legal', status: 'aprobado', date: '2024-07-15', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Constancia de Situación Fiscal (vigencia semestral)', status: 'vencido', date: '2024-01-15', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Opinión de cumplimiento positiva del SAT (vigencia mensual)', status: 'pendiente', date: null, types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Identificación Oficial del Representante', status: 'aprobado', date: '2024-07-20', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Acta constitutiva y sus modificaciones', status: 'aprobado', date: '2023-01-20', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Comprobante de domicilio fiscal (no mayor a 3 meses)', status: 'aprobado', date: '2024-06-01', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Carátula del estado de cuenta bancaria (preferentemente del nombre del titular coincidente)', status: 'rechazado', date: '2024-07-10', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Fotografía a color del exterior del domicilio fiscal/comercial', status: 'vencido', date: '2024-06-30', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Referencias comerciales', status: 'aprobado', date: '2024-07-18', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Carta firmada de aceptación al código de ética', status: 'pendiente', date: null, types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Registro en el REPSE', status: 'aprobado', date: '2024-05-20', types: ['services'], extraLabel: '(Solo si aplica)' },
    { name: 'Título de propiedad del inmueble arrendado o documento que acredite propiedad', status: 'aprobado', date: '2023-11-10', types: ['leasing'], extraLabel: '(Solo si aplica)' },
    { name: 'Comprobante de pago de predial vigente', status: 'vencido', date: '2024-03-31', types: ['leasing'], extraLabel: '(Solo si aplica)' },
    { name: 'Póliza de seguro de responsabilidad civil vigente', status: 'pendiente', date: null, types: ['transport'], extraLabel: '(Solo si aplica)' },
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
   'no aplica': {
    icon: <FileX className="h-5 w-5 text-muted-foreground" />,
    label: 'No Aplica',
    variant: 'outline',
    className: 'text-muted-foreground',
  },
};

const InfoRow = ({ label, value }: { label: string; value: string | undefined | React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-4 items-center">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className="col-span-2 font-medium text-sm">{value || '-'}</dd>
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
  
  const documentsForSupplier = allDocs.map(doc => {
      if (doc.types.includes(supplier.type)) {
          return doc;
      }
      return { ...doc, status: 'no aplica' as DocStatus };
  });

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
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
                    </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    {/* Datos Fiscales */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Datos Fiscales</h3>
                        <div className="space-y-4">
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
                        <div className="space-y-4">
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
                        <div className="space-y-4">
                        <InfoRow
                            label="Nombre"
                            value="Lic. Ernesto de la Cruz"
                        />
                        <InfoRow
                            label="Email"
                            value="e.delacruz@example.com"
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
                        <div className="space-y-4">
                            <InfoRow label="Código de Proveedor" value={`PROV-${supplier.id.padStart(3, '0')}`} />
                            <InfoRow label="Fecha de Registro" value={supplier.registrationDate} />
                            <InfoRow label="Estado Actual" value={
                            <Badge variant={supplier.status === 'active' ? 'default' : 'destructive'} className={cn(supplier.status === 'active' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200', 'hover:bg-transparent')}>
                                {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                            } />
                        </div>
                    </div>
                </CardContent>
            </Card>
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
                        {documentsForSupplier.map((doc, index) => {
                        const config = docStatusConfig[doc.status];
                        const isActionable = doc.status !== 'no aplica';
                        return (
                            <TableRow key={index}>
                            <TableCell className="font-medium">
                                {doc.name}
                                {doc.extraLabel && <span className="text-muted-foreground text-xs ml-2">{doc.extraLabel}</span>}
                            </TableCell>
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
                                <Button variant="outline" size="icon" disabled={!isActionable}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Ver</span>
                                </Button>
                                <Button variant="outline" size="sm" disabled={!isActionable}>Aprobar</Button>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={!isActionable}>Rechazar</Button>
                                <Button variant="link" size="sm" disabled={!isActionable}>Solicitar Actualización</Button>
                            </TableCell>
                            </TableRow>
                        );
                        })}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
