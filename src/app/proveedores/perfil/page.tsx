
'use client';

import React, { useState, useRef } from 'react';
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
import { Eye, Upload, Camera } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InfoField = ({
  label,
  value,
  placeholder,
  disabled,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1">
    <Label htmlFor={label.toLowerCase()}>{label}</Label>
    <Input
      id={label.toLowerCase()}
      defaultValue={value}
      placeholder={placeholder}
      className="bg-background/40 border-border/60"
      disabled={disabled}
    />
  </div>
);

type DocStatus = 'Vigente' | 'Por vencer' | 'Expirado';

const documents: {
  name: string;
  status: DocStatus;
  updateDate: string;
}[] = [
  { name: 'Poder notarial del representante legal', status: 'Vigente', updateDate: '2024-07-15' },
  { name: 'Constancia de Situación Fiscal (vigencia semestral)', status: 'Por vencer', updateDate: '2024-01-15' },
  { name: 'Opinión de cumplimiento positiva del SAT (vigencia mensual)', status: 'Vigente', updateDate: '2024-07-20' },
  { name: 'Identificación Oficial del Representante', status: 'Vigente', updateDate: '2024-01-20' },
  { name: 'Acta constitutiva y sus modificaciones', status: 'Expirado', updateDate: '2023-01-20' },
  { name: 'Comprobante de domicilio fiscal (no mayor a 3 meses)', status: 'Vigente', updateDate: '2024-06-01' },
  { name: 'Carátula del estado de cuenta bancaria (preferentemente del nombre del titular coincidente)', status: 'Vigente', updateDate: '2024-07-10' },
  { name: 'Fotografía a color del exterior del domicilio fiscal/comercial', status: 'Por vencer', updateDate: '2024-06-30' },
  { name: 'Referencias comerciales', status: 'Vigente', updateDate: '2024-07-18' },
  { name: 'Carta firmada de aceptación al código de ética', status: 'Vigente', updateDate: '2024-07-18' },
  { name: 'Registro en el REPSE (Sólo proveedores de servicios)', status: 'Vigente', updateDate: '2024-05-20' },
  { name: 'Título de propiedad del inmueble arrendado o documento que acredite propiedad (Sólo proveedores de arrendamiento)', status: 'Vigente', updateDate: '2023-11-10' },
  { name: 'Comprobante de pago de predial vigente (Solo proveedores de arrendamiento)', status: 'Expirado', updateDate: '2024-03-31' },
  { name: 'Póliza de seguro de responsabilidad civil vigente (Sólo proveedores de transporte)', status: 'Por vencer', updateDate: '2024-07-01' },
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
    setAvatarPreview(userAvatar?.imageUrl || null);
    setIsEditing(false);
  };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Inicio</span>
        <span>&gt;</span>
        <span className="text-foreground">Perfil</span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Perfil del Proveedor</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="banking">Información Bancaria</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card className="bg-card/70 mt-6">
            <CardHeader>
              <CardDescription>
                Mantenga su información personal y fiscal actualizada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center gap-6">
                <div
                  className={cn("relative group", isEditing && "cursor-pointer")}
                  onClick={() => isEditing && fileInputRef.current?.click()}
                >
                  <Avatar className="h-24 w-24">
                    {avatarPreview && (
                      <Image
                        src={avatarPreview}
                        alt="User avatar"
                        width={96}
                        height={96}
                        className="rounded-full object-cover"
                      />
                    )}
                    <AvatarFallback>SH</AvatarFallback>
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
                <div className="grid flex-1 gap-6 md:grid-cols-2">
                  <InfoField label="Nombre" value="Shirley Hendricks" disabled={!isEditing} />
                  <InfoField
                    label="Razón Social"
                    value="Soluciones Industriales SH S.A. de C.V."
                    disabled={true}
                  />
                  <InfoField label="RFC" value="SISH890101ABC" disabled={true} />
                  <InfoField label="Email" value="shirley.h@proveedor.com" disabled={!isEditing} />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <InfoField label="Dirección" value="Av. Siempre Viva 742, Springfield" disabled={!isEditing} />
                <InfoField label="Teléfono" value="55 1234 5678" disabled={!isEditing} />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <InfoField label="Representante" value="Shirley Hendricks" disabled={true} />
              </div>
              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar cambios</Button>
                  </>
                ) : (
                  <Button onClick={handleEdit}>Editar</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card className="bg-card/70 mt-6">
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
                      <TableCell className="font-medium text-sm">{doc.name}</TableCell>
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
        </TabsContent>
        <TabsContent value="banking">
          <Card className="bg-card/70 mt-6">
            <CardHeader>
              <CardTitle>Información Bancaria</CardTitle>
              <CardDescription>
                Gestione sus datos bancarios para recibir pagos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <InfoField label="Banco" value="BBVA Bancomer" disabled={!isEditing} />
                <InfoField label="CLABE" value="012180012345678901" disabled={!isEditing} />
                <InfoField label="Número de cuenta" value="0123456789" disabled={!isEditing} />
              </div>
              <div className="flex justify-end gap-2">
                 {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar cambios</Button>
                  </>
                ) : (
                  <Button onClick={handleEdit}>Editar</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

    