'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Eye, Upload } from 'lucide-react';
import Image from 'next/image';

const InfoField = ({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <Label htmlFor={label.toLowerCase()}>{label}</Label>
    <Input
      id={label.toLowerCase()}
      defaultValue={value}
      placeholder={placeholder}
      className="bg-background/40 border-border/60"
    />
  </div>
);

type DocStatus = 'Vigente' | 'Por vencer' | 'Expirado';

const documents: {
  name: string;
  status: DocStatus;
  updateDate: string;
}[] = [
  {
    name: 'Constancia de Situación Fiscal',
    status: 'Vigente',
    updateDate: '2024-06-15',
  },
  {
    name: 'Opinión de Cumplimiento',
    status: 'Por vencer',
    updateDate: '2023-08-01',
  },
  {
    name: 'Identificación Oficial del Representante',
    status: 'Vigente',
    updateDate: '2024-01-20',
  },
  { name: 'Acta Constitutiva', status: 'Expirado', updateDate: '2022-03-10' },
  {
    name: 'Comprobante de Domicilio',
    status: 'Vigente',
    updateDate: '2024-05-30',
  },
];

const getStatusBadgeClass = (status: DocStatus) => {
  switch (status) {
    case 'Vigente':
      return 'bg-green-500/20 text-green-200 border-green-500/30';
    case 'Por vencer':
      return 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30';
    case 'Expirado':
      return 'bg-red-500/20 text-red-200 border-red-500/30';
  }
};

export default function PerfilProveedorPage() {
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Inicio</span>
        <span>&gt;</span>
        <span className="text-foreground">Perfil</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Perfil del Proveedor</h1>

      <Card className="bg-card/70">
        <CardHeader>
          <CardDescription>
            Mantenga su información personal, fiscal y bancaria actualizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              {userAvatar && (
                <Image
                  src={userAvatar.imageUrl}
                  alt={userAvatar.description}
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              )}
              <AvatarFallback>SH</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 gap-6 md:grid-cols-2">
              <InfoField label="Nombre" value="Shirley Hendricks" />
              <InfoField
                label="Razón Social"
                value="Soluciones Industriales SH S.A. de C.V."
              />
              <InfoField label="RFC" value="SISH890101ABC" />
              <InfoField label="Email" value="shirley.h@proveedor.com" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <InfoField label="Dirección" value="Av. Siempre Viva 742, Springfield" />
            <InfoField label="Teléfono" value="55 1234 5678" />
          </div>
           <div className="grid gap-6 md:grid-cols-2">
             <InfoField label="Representante" value="Shirley Hendricks" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <InfoField label="Banco" value="BBVA Bancomer" />
            <InfoField label="CLABE" value="012180012345678901" />
            <InfoField label="Número de cuenta" value="0123456789" />
          </div>
          <div className="flex justify-end">
            <Button>Guardar cambios</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Documentación</CardTitle>
          <CardDescription>
            Gestione los documentos requeridos para mantener su perfil activo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-normal', getStatusBadgeClass(doc.status))}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.updateDate}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Subir
                    </Button>
                    <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
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
