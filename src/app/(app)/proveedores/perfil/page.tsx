'use client';

import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Eye, Upload, Camera, FileCheck, FileClock, FileX, FileQuestion } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InfoField = ({
  label,
  value,
  isEditing,
}: {
  label: string;
  value?: string;
  isEditing: boolean;
}) => (
  <div className="grid grid-cols-3 gap-2 text-sm items-center">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="col-span-2">
       <Input
        id={label.toLowerCase()}
        defaultValue={value}
        className="bg-background/40 border-border/60 h-8"
        disabled={!isEditing}
      />
    </dd>
  </div>
);

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado' | 'vencido';

const documents: {
  name: string;
  status: DocStatus;
  updateDate: string;
  types: string[];
}[] = [
    { name: 'Poder notarial del representante legal', status: 'aprobado', updateDate: '2024-07-15', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Constancia de Situación Fiscal (vigencia semestral)', status: 'vencido', updateDate: '2024-01-15', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Opinión de cumplimiento positiva del SAT (vigencia mensual)', status: 'pendiente', updateDate: 'N/A', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Identificación Oficial del Representante', status: 'aprobado', updateDate: '2024-07-20', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Acta constitutiva y sus modificaciones', status: 'aprobado', updateDate: '2023-01-20', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Comprobante de domicilio fiscal (no mayor a 3 meses)', status: 'aprobado', updateDate: '2024-06-01', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Carátula del estado de cuenta bancaria (preferentemente del nombre del titular coincidente)', status: 'rechazado', updateDate: '2024-07-10', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Fotografía a color del exterior del domicilio fiscal/comercial', status: 'vencido', updateDate: '2024-06-30', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Referencias comerciales', status: 'aprobado', updateDate: '2024-07-18', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Carta firmada de aceptación al código de ética', status: 'pendiente', updateDate: 'N/A', types: ['supplies', 'services', 'leasing', 'transport'] },
    { name: 'Registro en el REPSE (Solo si aplica)', status: 'aprobado', updateDate: '2024-05-20', types: ['services'] },
    { name: 'Título de propiedad del inmueble arrendado o documento que acredite propiedad (Solo si aplica)', status: 'aprobado', updateDate: '2023-11-10', types: ['leasing'] },
    { name: 'Comprobante de pago de predial vigente (Solo si aplica)', status: 'vencido', updateDate: '2024-03-31', types: ['leasing'] },
    { name: 'Póliza de seguro de responsabilidad civil vigente (Solo si aplica)', status: 'pendiente', updateDate: 'N/A', types: ['transport'] },
];

const docStatusConfig = {
  aprobado: {
    icon: <FileCheck className="h-5 w-5 text-green-500" />,
    label: 'Aprobado',
    className: 'bg-green-500/20 text-green-200 border-green-500/30',
  },
  pendiente: {
    icon: <FileClock className="h-5 w-5 text-yellow-500" />,
    label: 'Pendiente',
    className: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
  },
  rechazado: {
    icon: <FileX className="h-5 w-5 text-red-500" />,
    label: 'Rechazado',
    className: 'bg-red-500/20 text-red-200 border-red-500/30',
  },
  vencido: {
    icon: <FileQuestion className="h-5 w-5 text-orange-500" />,
    label: 'Vencido',
    className: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
  },
};

// Assuming the supplier type is 'services' for this example
const supplierType = 'services';
const documentsForSupplier = documents.filter(doc => doc.types.includes(supplierType));


export default function PerfilProveedorPage() {
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatar?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // Here you would typically save the form data
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Optionally reset form data to initial state here
    setIsEditing(false);
  };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Perfil del Proveedor</h1>
       <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="documentation">Documentación</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                  <div>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>
                      Mantenga su información personal, fiscal y bancaria actualizada.
                    </CardDescription>
                  </div>
                  <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar Cambios</Button>
                      </>
                    ) : (
                      <Button onClick={handleEdit}>Editar</Button>
                    )}
                  </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center gap-6">
                    <div
                    className={cn("relative group", isEditing && "cursor-pointer")}
                    onClick={() => isEditing && fileInputRef.current?.click()}
                    >
                    <Avatar className="h-24 w-24">
                        {avatarPreview ? (
                        <Image
                            src={avatarPreview}
                            alt="User avatar"
                            width={96}
                            height={96}
                            className="rounded-full object-cover"
                        />
                        ) : <AvatarFallback>SH</AvatarFallback>}
                    </Avatar>
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-8 w-8 text-white" />
                        </div>
                    )}
                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={!isEditing}
                    />
                    </div>
                     <div className="flex-1 space-y-4">
                         <h3 className="text-lg font-semibold">Datos Fiscales</h3>
                         <InfoField label="Razón Social" value="Soluciones Industriales SH S.A. de C.V." isEditing={isEditing} />
                         <InfoField label="RFC" value="SISH890101ABC" isEditing={isEditing} />
                         <InfoField label="Dirección Fiscal" value="Av. Siempre Viva 742, Springfield" isEditing={isEditing} />
                    </div>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                  <div className="space-y-4">
                    <InfoField label="Nombre del Contacto" value="Shirley Hendricks" isEditing={isEditing} />
                    <InfoField label="Email" value="shirley.h@proveedor.com" isEditing={isEditing} />
                    <InfoField label="Teléfono" value="55 1234 5678" isEditing={isEditing} />
                  </div>
                </div>

                 <Separator />
                
                 <div>
                  <h3 className="text-lg font-semibold mb-4">Representante Legal</h3>
                  <div className="space-y-4">
                    <InfoField label="Nombre" value="Shirley Hendricks" isEditing={isEditing} />
                     <InfoField label="Email" value="shirley.h@proveedor.com" isEditing={isEditing} />
                  </div>
                </div>

                <Separator />

                <div>
                   <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
                   <div className="space-y-4">
                     <InfoField label="Banco" value="BBVA Bancomer" isEditing={isEditing} />
                     <InfoField label="CLABE" value="012180012345678901" isEditing={isEditing} />
                     <InfoField label="Número de cuenta" value="0123456789" isEditing={isEditing} />
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
                  Gestione y valide los documentos requeridos para mantener su perfil activo.
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
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn('gap-1 font-normal', config.className)}
                            >
                              {config.icon}
                              {config.label}
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
                               <span className="sr-only">Ver</span>
                            </Button>
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
    </main>
  );
}
