'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
        value={value || ''}
        className="bg-background/40 border-border/60 h-8"
        disabled={!isEditing}
        readOnly
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
    className: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800',
  },
  pendiente: {
    icon: <FileClock className="h-5 w-5 text-yellow-500" />,
    label: 'Pendiente',
    className: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  rechazado: {
    icon: <FileX className="h-5 w-5 text-red-500" />,
    label: 'Rechazado',
    className: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 bg-red-100 text-red-800',
  },
};

export default function PerfilProveedorPage() {
  const { data: session } = useSession();
  
  // Verificar si es vista de admin
  const [isAdminView, setIsAdminView] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id');
    setIsAdminView(!!idFromQuery);
    
    // Si es vista de admin, cargar datos inmediatamente
    if (idFromQuery) {
      setProveedorId(idFromQuery);
      cargarInfoProveedor(idFromQuery);
      cargarDocumentos(idFromQuery);
    }
  }, []);
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    userAvatar?.imageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados para datos del proveedor
  const [proveedorInfo, setProveedorInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Estados para documentos
  const [documentos, setDocumentos] = useState<any[]>([]); // Documentos con archivo
  const [documentosERP, setDocumentosERP] = useState<any[]>([]); // Todos los documentos del ERP
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocTipo, setSelectedDocTipo] = useState<TipoDocumento | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Obtener ID del proveedor desde query params o usar el usuario logueado
  const [proveedorId, setProveedorId] = useState<string>('');

  useEffect(() => {
    // Solo para vista normal (no admin)
    if (!isAdminView && session?.user?.id) {
      const finalId = session.user.id;
      setProveedorId(finalId);
      cargarInfoProveedor(finalId);
      cargarDocumentos(finalId);
    }
  }, [session, isAdminView]);

  const cargarInfoProveedor = async (id: string) => {
    if (!id) return;

    setLoadingInfo(true);
    try {
      // Si hay un parámetro 'id' en la URL, es vista de admin
      const isAdminView = new URLSearchParams(window.location.search).get('id');
      const endpoint = isAdminView ? `/api/admin/proveedores/${id}` : '/api/proveedor/info';
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();

      if (result.success || result.erpDatos) {
        // Mapear datos desde el endpoint de admin
        const data = result.erpDatos ? {
          razonSocial: result.erpDatos.nombre,
          rfc: result.erpDatos.rfc,
          codigo: result.erpDatos.proveedor,
          direccionFiscal: result.erpDatos.direccion,
          colonia: result.erpDatos.colonia,
          poblacion: result.erpDatos.ciudad,
          estado: result.erpDatos.estado,
          codigoPostal: result.erpDatos.codigoPostal,
          nombreContacto: result.erpDatos.contacto1,
          email: result.erpDatos.email1 || result.portalEmail,
          telefono: result.erpDatos.telefono || result.portalTelefono,
          numeroCuenta: result.erpDatos.cuenta,
          codigoProveedorERP: result.erpDatos.proveedor,
          estatus: result.erpDatos.estatus
        } : result.data;
        
        console.log('✅ Información del proveedor cargada:', data);
        setProveedorInfo(data);
      } else {
        console.error('❌ Error cargando información:', result.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const cargarDocumentos = async (id: string) => {
    if (!id) return;

    setLoading(true);
    try {
      console.log("🔍 Cargando documentos desde ERP...");
      // Si es un ID de admin, usar el endpoint de admin (por ahora usar el mismo)
      const response = await fetch('/api/proveedor/documentos');
      const result = await response.json();

      if (result.success) {
        console.log("✅ Documentos del ERP cargados:", result.data);

        // Guardar TODOS los documentos del ERP
        setDocumentosERP(result.data.documentos || []);

        // Guardar estadísticas
        setEstadisticas(result.data.estadisticas || null);

        // Transformar solo los documentos con archivo para la lista de documentos subidos
        const documentosConArchivo = result.data.documentos
          .filter((doc: any) => doc.tieneArchivo)
          .map((doc: any) => ({
            id: doc.idr?.toString() || '',
            proveedorId: proveedorId,
            tipoDocumento: doc.documentoRequerido.toLowerCase().replace(/\s+/g, '_'),
            fileName: doc.nombreArchivo || doc.documentoRequerido,
            fileUrl: doc.rutaArchivo || '',
            uploadedAt: doc.fechaAlta || new Date().toISOString(),
            status: doc.autorizado ? 'aprobado' : (doc.rechazado ? 'rechazado' : 'pendiente'),
            reviewedBy: doc.usuario || null,
            reviewedAt: doc.fechaUltimoCambio || null,
            observaciones: doc.observaciones || null,
          }));

        setDocumentos(documentosConArchivo);
        console.log("📦 Documentos ERP:", result.data.documentos);
        console.log("📦 Estadísticas:", result.data.estadisticas);
      } else {
        console.error("❌ Error cargando documentos:", result.error);
      }
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
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
        await cargarDocumentos(proveedorId); // This re-fetches the documents, including the new date
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

  const getDocumentoStatus = (documentoRequerido: string) => {
    // Buscar en documentosERP por el nombre del documento
    const docERP = documentosERP.find((d: any) =>
      d.documentoRequerido.toLowerCase() === documentoRequerido.toLowerCase()
    );
    return docERP;
  };

  const totalDocumentos = documentosERP.length || 14; // Usar documentos del ERP o default
  const documentosAprobados = estadisticas?.documentosAutorizados || 0;
  const documentosConArchivo = estadisticas?.documentosConArchivo || 0;
  const porcentajeCompletado = Math.round((documentosConArchivo / totalDocumentos) * 100);

  // Obtener iniciales para el avatar
  const getInitials = () => {
    if (proveedorInfo?.razonSocial) {
      const words = proveedorInfo.razonSocial.split(' ');
      return words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    }
    return session?.user?.name?.slice(0, 2).toUpperCase() || 'PR';
  };

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
                      Información del proveedor obtenida del ERP de la empresa seleccionada.
                    </CardDescription>
                  </div>
                  {/* <div className="flex justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar Cambios</Button>
                      </>
                    ) : (
                      <Button onClick={handleEdit}>Editar</Button>
                    )}
                  </div> */}
              </CardHeader>
              <CardContent className="space-y-8">
                {loadingInfo ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Cargando información del proveedor...</span>
                  </div>
                ) : !proveedorInfo ? (
                  <div className="flex items-center justify-center p-8">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mr-2" />
                    <span>No se pudo cargar la información del proveedor</span>
                  </div>
                ) : (
                  <>
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
                            ) : <AvatarFallback>{getInitials()}</AvatarFallback>}
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
                             <InfoField label="Razón Social" value={proveedorInfo.razonSocial} isEditing={isEditing} />
                             <InfoField label="RFC" value={proveedorInfo.rfc} isEditing={isEditing} />
                             <InfoField label="Código Proveedor" value={proveedorInfo.codigo} isEditing={isEditing} />
                             <InfoField label="Dirección Fiscal" value={proveedorInfo.direccionFiscal} isEditing={isEditing} />
                             <InfoField label="Colonia" value={proveedorInfo.colonia} isEditing={isEditing} />
                             <InfoField label="Ciudad/Población" value={proveedorInfo.poblacion} isEditing={isEditing} />
                             <InfoField label="Estado" value={proveedorInfo.estado} isEditing={isEditing} />
                             <InfoField label="Código Postal" value={proveedorInfo.codigoPostal} isEditing={isEditing} />
                        </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                      <div className="space-y-4">
                        <InfoField label="Nombre del Contacto" value={proveedorInfo.nombreContacto} isEditing={isEditing} />
                        <InfoField label="Email" value={proveedorInfo.email} isEditing={isEditing} />
                        <InfoField label="Teléfono" value={proveedorInfo.telefono} isEditing={isEditing} />
                      </div>
                    </div>

                     <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
                       <div className="space-y-4">
                         <InfoField label="Número de cuenta" value={proveedorInfo.numeroCuenta} isEditing={isEditing} />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Contexto</h3>
                      <div className="space-y-4">
                        <InfoField label="Empresa Actual" value={session?.user?.empresaActual} isEditing={false} />
                        <InfoField label="Código en ERP" value={proveedorInfo.codigoProveedorERP} isEditing={false} />
                        <InfoField label="Estado" value={proveedorInfo.estatus} isEditing={false} />
                      </div>
                    </div>
                  </>
                )}
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
                      {documentosConArchivo}/{totalDocumentos} con archivo
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {documentosAprobados} aprobados
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
                      {documentosERP.length > 0 ? (
                        documentosERP.map((docERP: any) => {
                          // Determinar el estado del documento
                          const status = docERP.autorizado ? 'aprobado' : (docERP.rechazado ? 'rechazado' : (docERP.tieneArchivo ? 'pendiente' : 'pendiente'));
                          const config = docStatusConfig[status as DocStatus];

                          return (
                            <TableRow key={docERP.orden}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{docERP.documentoRequerido}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {docERP.grupo}
                                    {docERP.requerido && ' • Requerido'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={cn('gap-1 font-normal', config.className)}
                                >
                                  {config.icon}
                                  {config.label}
                                  {!docERP.tieneArchivo && ' - Sin archivo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {docERP.fechaAlta
                                  ? new Date(docERP.fechaAlta).toLocaleDateString('es-MX', {
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
                                    onClick={() => openUploadDialog(docERP.documentoRequerido as TipoDocumento)}
                                  >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {docERP.tieneArchivo ? 'Reemplazar' : 'Subir'}
                                  </Button>
                                  {docERP.tieneArchivo && docERP.rutaArchivo && (
                                    <>
                                      <Button variant="ghost" size="sm" title={`Archivo: ${docERP.rutaArchivo}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver
                                      </Button>
                                      <Button variant="ghost" size="sm" title="Descargar archivo">
                                        <Download className="h-4 w-4" />
                                        <span className="sr-only">Descargar</span>
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center p-8">
                            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                            <p>No se encontraron documentos en el ERP</p>
                          </TableCell>
                        </TableRow>
                      )}
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
