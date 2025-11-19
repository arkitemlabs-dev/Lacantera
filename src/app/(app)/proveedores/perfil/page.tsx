'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Eye, Upload, Camera, FileCheck, FileClock, FileX, AlertCircle, Loader2, Download } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/upload/file-upload';
import { uploadDocumentoProveedor } from '@/app/actions/archivos';
import { getDocumentosByProveedor } from '@/app/actions/proveedores';

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

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado';

type TipoDocumento = 
  | 'acta_constitutiva'
  | 'comprobante_domicilio'
  | 'identificacion_representante'
  | 'constancia_fiscal'
  | 'caratula_bancaria'
  | 'poder_notarial'
  | 'opinion_cumplimiento'
  | 'foto_domicilio'
  | 'referencias_comerciales'
  | 'codigo_etica'
  | 'repse'
  | 'titulo_propiedad'
  | 'pago_predial'
  | 'poliza_seguro';

interface DocumentoRequerido {
  tipo: TipoDocumento;
  nombre: string;
  descripcion: string;
  required: boolean;
  vigencia?: string;
}

const documentosRequeridos: DocumentoRequerido[] = [
  {
    tipo: 'poder_notarial',
    nombre: 'Poder notarial del representante legal',
    descripcion: 'Documento notariado',
    required: true,
  },
  {
    tipo: 'constancia_fiscal',
    nombre: 'Constancia de Situación Fiscal',
    descripcion: 'Vigencia semestral',
    required: true,
    vigencia: '6 meses',
  },
  {
    tipo: 'opinion_cumplimiento',
    nombre: 'Opinión de cumplimiento positiva del SAT',
    descripcion: 'Vigencia mensual',
    required: true,
    vigencia: '1 mes',
  },
  {
    tipo: 'identificacion_representante',
    nombre: 'Identificación Oficial del Representante',
    descripcion: 'INE, pasaporte o cédula',
    required: true,
  },
  {
    tipo: 'acta_constitutiva',
    nombre: 'Acta constitutiva y sus modificaciones',
    descripcion: 'Documento legal de la empresa',
    required: true,
  },
  {
    tipo: 'comprobante_domicilio',
    nombre: 'Comprobante de domicilio fiscal',
    descripcion: 'No mayor a 3 meses',
    required: true,
    vigencia: '3 meses',
  },
  {
    tipo: 'caratula_bancaria',
    nombre: 'Carátula del estado de cuenta bancaria',
    descripcion: 'Estado de cuenta o formato del banco',
    required: true,
  },
  {
    tipo: 'foto_domicilio',
    nombre: 'Fotografía del exterior del domicilio',
    descripcion: 'Foto a color del domicilio fiscal/comercial',
    required: true,
  },
  {
    tipo: 'referencias_comerciales',
    nombre: 'Referencias comerciales',
    descripcion: 'Mínimo 2 referencias',
    required: true,
  },
  {
    tipo: 'codigo_etica',
    nombre: 'Carta de aceptación al código de ética',
    descripcion: 'Documento firmado',
    required: true,
  },
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
  
  // Estados para documentos
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocTipo, setSelectedDocTipo] = useState<TipoDocumento | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const proveedorId = 'proveedor-1'; // TODO: obtener del usuario autenticado

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    setLoading(true);
    console.log("🔍 Cargando documentos para proveedorId:", proveedorId);
    const result = await getDocumentosByProveedor(proveedorId);
    console.log("📦 Resultado:", result);
    if (result.success) {
      console.log("✅ Documentos cargados:", result.data);
      setDocumentos(result.data || []);
    } else {
      console.error("❌ Error cargando documentos:", result.error);
    }
    setLoading(false);
  };


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
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const openUploadDialog = (tipo: TipoDocumento) => {
    setSelectedDocTipo(tipo);
    setSelectedFile(null);
    setUploadDialogOpen(true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !selectedDocTipo) return;

    setUploading(true);

    try {
      const base64 = await fileToBase64(selectedFile);

      const result = await uploadDocumentoProveedor({
        proveedorId,
        tipoDocumento: selectedDocTipo,
        file: base64,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });

      if (result.success) {
        await cargarDocumentos(); // This re-fetches the documents, including the new date
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setSelectedDocTipo(null);
      } else {
        alert(result.error);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getDocumentoStatus = (tipo: TipoDocumento) => {
    return documentos.find((d) => d.tipoDocumento === tipo);
  };

  const totalDocumentos = documentosRequeridos.length;
  const documentosAprobados = documentos.filter((d) => d.status === 'aprobado').length;
  const porcentajeCompletado = Math.round((documentosAprobados / totalDocumentos) * 100);

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Perfil del Proveedor</h1>
       <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader className="flex flex-row justify-between items-start">
                  <div>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>
                      Mantenga su información fiscal, de contacto y bancaria actualizada.
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
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Documentos</CardTitle>
                    <CardDescription>
                      Gestione y valide los documentos requeridos para mantener su perfil activo.
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{porcentajeCompletado}%</div>
                    <div className="text-xs text-muted-foreground">
                      {documentosAprobados}/{totalDocumentos} aprobados
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
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
                      {documentosRequeridos.map((docReq) => {
                        const doc = getDocumentoStatus(docReq.tipo);
                        const config = doc ? docStatusConfig[doc.status as DocStatus] : docStatusConfig.pendiente;
                        
                        return (
                          <TableRow key={docReq.tipo}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{docReq.nombre}</div>
                                <div className="text-xs text-muted-foreground">
                                  {docReq.descripcion}
                                  {docReq.vigencia && ` • Vigencia: ${docReq.vigencia}`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn('gap-1 font-normal', config.className)}
                              >
                                {config.icon}
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {doc 
                                ? new Date(doc.uploadedAt).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openUploadDialog(docReq.tipo)}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  {doc ? 'Reemplazar' : 'Subir'}
                                </Button>
                                {doc && (
                                  <>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc.archivoUrl} target="_blank" rel="noopener noreferrer">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver
                                      </a>
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc.archivoUrl} download>
                                        <Download className="h-4 w-4" />
                                        <span className="sr-only">Descargar</span>
                                      </a>
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de subida */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
              <DialogDescription>
                {selectedDocTipo && documentosRequeridos.find(d => d.tipo === selectedDocTipo)?.nombre}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FileUpload
                accept={{
                  'application/pdf': ['.pdf'],
                  'image/jpeg': ['.jpg', '.jpeg'],
                  'image/png': ['.png'],
                }}
                maxSize={10 * 1024 * 1024}
                onFileSelect={setSelectedFile}
                label="Arrastra tu documento aquí"
                description="PDF, JPG o PNG (máx. 10MB)"
              />

              <Button
                onClick={handleUploadDocument}
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Documento
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </main>
  );
}
