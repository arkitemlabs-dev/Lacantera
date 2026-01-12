'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  FileCheck,
  FileClock,
  FileX,
  FileQuestion,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getProveedor, getDocumentosByProveedor } from '@/app/actions/proveedores';

type DocStatus = 'aprobado' | 'pendiente' | 'rechazado';

const docStatusConfig = {
  aprobado: {
    icon: <FileCheck className="h-5 w-5 text-green-500" />,
    label: 'Aprobado',
    variant: 'default' as const,
    className: 'dark:bg-green-500/20 dark:text-green-200 border-green-500/30 bg-green-100 text-green-800',
  },
  pendiente: {
    icon: <FileClock className="h-5 w-5 text-yellow-500" />,
    label: 'Pendiente',
    variant: 'secondary' as const,
    className: 'dark:bg-yellow-500/20 dark:text-yellow-200 border-yellow-500/30 bg-yellow-100 text-yellow-800',
  },
  rechazado: {
    icon: <FileX className="h-5 w-5 text-red-500" />,
    label: 'Rechazado',
    variant: 'destructive' as const,
    className: 'dark:bg-red-500/20 dark:text-red-200 border-red-500/30 bg-red-100 text-red-800',
  },
};

const InfoRow = ({ label, value }: { label: string; value: string | undefined | React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-4 items-center">
    <dt className="text-muted-foreground text-sm">{label}</dt>
    <dd className="col-span-2 font-medium text-sm">{value || '-'}</dd>
  </div>
);

export default function SupplierProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [proveedor, setProveedor] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (params.supplierId) {
      cargarDatos();
    }
  }, [params.supplierId]);

  const cargarDatos = async () => {
    setLoading(true);
    console.log('🔍 Cargando proveedor:', params.supplierId);
    
    // Cargar proveedor
    const resultProveedor = await getProveedor(params.supplierId as string);
    console.log('📦 Proveedor:', resultProveedor);
    
    if (resultProveedor.success) {
      setProveedor(resultProveedor.data);
      
      // Cargar documentos
      const resultDocs = await getDocumentosByProveedor(params.supplierId as string);
      console.log('📄 Documentos:', resultDocs);
      
      if (resultDocs.success) {
        setDocumentos(resultDocs.data || []);
      }
    }

    setLoading(false);
  };

  const handleOpenDocumentDialog = (doc: any) => {
    setSelectedDocument(doc);
    setRejectionReason('');
    setIsDocumentDialogOpen(true);
  };

  const handleApproveDocument = async () => {
    if (!selectedDocument) return;
    
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/proveedores/${params.supplierId}/documentos/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'aprobar',
          motivo: 'Documento aprobado por administrador'
        })
      });
      
      if (response.ok) {
        await cargarDatos(); // Recargar datos
        setIsDocumentDialogOpen(false);
      }
    } catch (error) {
      console.error('Error aprobando documento:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!selectedDocument || !rejectionReason.trim()) return;
    
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/proveedores/${params.supplierId}/documentos/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'rechazar',
          motivo: rejectionReason.trim()
        })
      });
      
      if (response.ok) {
        await cargarDatos(); // Recargar datos
        setIsDocumentDialogOpen(false);
      }
    } catch (error) {
      console.error('Error rechazando documento:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRequestUpdate = async () => {
    if (!selectedDocument || !rejectionReason.trim()) return;
    
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/admin/proveedores/${params.supplierId}/documentos/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'solicitar_actualizacion',
          motivo: rejectionReason.trim()
        })
      });
      
      if (response.ok) {
        await cargarDatos(); // Recargar datos
        setIsDocumentDialogOpen(false);
      }
    } catch (error) {
      console.error('Error solicitando actualización:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!proveedor) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Proveedor no encontrado</h2>
          <Button className="mt-4" onClick={() => router.push('/proveedores')}>
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  const totalDocumentos = documentos.length;
  const documentosAprobados = documentos.filter((d) => d.status === 'aprobado').length;
  const porcentajeCompletado = totalDocumentos > 0 
    ? Math.round((documentosAprobados / totalDocumentos) * 100)
    : 0;

  return (
    <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/proveedores">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{proveedor.razonSocial}</h1>
            <p className="text-muted-foreground">RFC: {proveedor.rfc}</p>
          </div>
        </div>
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="documents">Documentación ({porcentajeCompletado}%)</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
                 <Card className="mt-6">
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
                                    proveedor.status === 'active' ? 'destructive' : 'default'
                                    }
                                >
                                    {proveedor.status === 'active'
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
                            <InfoRow label="Razón Social" value={proveedor.razonSocial} />
                            <InfoRow label="RFC" value={proveedor.rfc} />
                            <InfoRow label="Código ERP" value={proveedor.codigoERP} />
                            <InfoRow
                                label="Dirección Fiscal"
                                value={proveedor.direccion ?
                                  `${proveedor.direccion.calle || ''} ${proveedor.direccion.ciudad ? ', ' + proveedor.direccion.ciudad : ''} ${proveedor.direccion.estado ? ', ' + proveedor.direccion.estado : ''} ${proveedor.direccion.cp ? 'C.P. ' + proveedor.direccion.cp : ''}`.trim() || '-'
                                  : proveedor.direccionFiscal || '-'
                                }
                            />
                            <InfoRow label="Categoría" value={proveedor.categoria} />
                            </div>
                        </div>
                        <Separator />
                        {/* Datos de Contacto */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Datos de Contacto</h3>
                            <div className="space-y-4">
                            <InfoRow
                                label="Contacto Principal"
                                value={proveedor.contacto1 || proveedor.nombreContacto || proveedor.displayName}
                            />
                            <InfoRow
                                label="Email"
                                value={proveedor.email}
                            />
                            {proveedor.email2 && (
                              <InfoRow label="Email Secundario" value={proveedor.email2} />
                            )}
                            <InfoRow label="Teléfono" value={proveedor.telefono} />
                            {proveedor.contacto2 && (
                              <InfoRow label="Contacto Secundario" value={proveedor.contacto2} />
                            )}
                            </div>
                        </div>
                        <Separator />
                        {/* Condiciones Comerciales */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Condiciones Comerciales</h3>
                            <div className="space-y-4">
                            <InfoRow label="Condición de Pago" value={proveedor.condicionPago} />
                            <InfoRow label="Forma de Pago" value={proveedor.formaPago} />
                            {(proveedor.diasRevision?.length > 0) && (
                              <InfoRow label="Días de Revisión" value={proveedor.diasRevision?.join(', ')} />
                            )}
                            {(proveedor.diasPago?.length > 0) && (
                              <InfoRow label="Días de Pago" value={proveedor.diasPago?.join(', ')} />
                            )}
                            </div>
                        </div>
                        <Separator />
                        {/* Información Bancaria */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Información Bancaria</h3>
                            <div className="space-y-4">
                            <InfoRow label="Banco" value={proveedor.banco || proveedor.informacionBancaria?.banco} />
                            <InfoRow label="Cuenta Bancaria" value={proveedor.cuentaBancaria || proveedor.informacionBancaria?.numeroCuenta} />
                            {proveedor.informacionBancaria?.clabe && (
                              <InfoRow label="CLABE" value={proveedor.informacionBancaria?.clabe} />
                            )}
                            </div>
                        </div>
                        <Separator />
                        {/* Estado de la cuenta */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Estado de la Cuenta</h3>
                            <div className="space-y-4">
                                <InfoRow
                                  label="Registrado en Portal"
                                  value={
                                    <Badge
                                      variant={proveedor.registradoEnPortal ? 'default' : 'secondary'}
                                      className={cn(
                                        proveedor.registradoEnPortal
                                          ? 'dark:bg-green-500/20 dark:text-green-200 bg-green-100 text-green-800'
                                          : 'dark:bg-orange-500/20 dark:text-orange-200 bg-orange-100 text-orange-800',
                                        'hover:bg-transparent'
                                      )}
                                    >
                                      {proveedor.registradoEnPortal ? 'Sí' : 'No'}
                                    </Badge>
                                  }
                                />
                                {proveedor.registradoEnPortal && proveedor.fechaRegistroPortal && (
                                  <InfoRow
                                    label="Fecha de Registro Portal"
                                    value={new Date(proveedor.fechaRegistroPortal).toLocaleDateString('es-MX')}
                                  />
                                )}
                                <InfoRow
                                  label="Fecha Alta ERP"
                                  value={proveedor.createdAt
                                    ? new Date(proveedor.createdAt).toLocaleDateString('es-MX')
                                    : 'N/A'
                                  }
                                />
                                <InfoRow label="Estado en ERP" value={
                                <Badge
                                  variant={proveedor.status === 'activo' ? 'default' : 'destructive'}
                                  className={cn(
                                    proveedor.status === 'activo'
                                      ? 'dark:bg-green-500/20 dark:text-green-200 bg-green-100 text-green-800'
                                      : proveedor.status === 'pendiente_validacion'
                                        ? 'dark:bg-yellow-500/20 dark:text-yellow-200 bg-yellow-100 text-yellow-800'
                                        : 'dark:bg-red-500/20 dark:text-red-200 bg-red-100 text-red-800',
                                    'hover:bg-transparent'
                                  )}
                                >
                                    {proveedor.status === 'activo' ? 'Activo (Alta)'
                                      : proveedor.status === 'pendiente_validacion' ? 'Pendiente Validación'
                                      : proveedor.status === 'suspendido' ? 'Bloqueado'
                                      : 'Baja'}
                                </Badge>
                                } />
                                {proveedor.situacion && (
                                  <InfoRow label="Situación" value={proveedor.situacion} />
                                )}
                                {proveedor.situacionNota && (
                                  <InfoRow label="Nota de Situación" value={proveedor.situacionNota} />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="documents">
                <Card className="mt-6">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>Documentación</CardTitle>
                          <CardDescription>
                            Gestione y valide los documentos del proveedor.
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
                      {documentos.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                          No hay documentos cargados.
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
                            {documentos.map((doc) => {
                            const config = docStatusConfig[doc.status as DocStatus] || docStatusConfig.pendiente;
                            return (
                                <TableRow key={doc.id}>
                                <TableCell className="font-medium">
                                    {doc.tipoDocumento}
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
                                <TableCell>
                                  {doc.uploadedAt 
                                    ? new Date(doc.uploadedAt).toLocaleDateString('es-MX', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                      })
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {doc.archivoUrl && (
                                      <>
                                        <DialogTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="icon"
                                            onClick={() => handleOpenDocumentDialog(doc)}
                                          >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">Ver</span>
                                          </Button>
                                        </DialogTrigger>
                                        <Button variant="ghost" size="icon" asChild>
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
      </div>

       {selectedDocument && (
        <DialogContent className="max-w-4xl grid-rows-[auto_1fr_auto]">
          <DialogHeader>
            <DialogTitle>Revisión de Documento</DialogTitle>
            <DialogDescription>
              {selectedDocument.tipoDocumento} - {proveedor.razonSocial}
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] p-1">
            {/* Document Viewer */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visualizador de Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted h-[500px] flex items-center justify-center rounded-md border-2 border-dashed">
                    {selectedDocument.archivoUrl ? (
                      <iframe 
                        src={selectedDocument.archivoUrl} 
                        className="w-full h-full rounded-md"
                        title="Documento"
                      />
                    ) : (
                      <p className="text-muted-foreground">
                        Vista previa del documento no disponible.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Validation & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Validaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={cn("flex items-center justify-between p-3 rounded-md", selectedDocument.status === 'aprobado' ? "bg-green-500/10" : "bg-yellow-500/10")}>
                    <p className={cn("text-sm", selectedDocument.status === 'aprobado' ? "dark:text-green-200 text-green-800" : "dark:text-yellow-200 text-yellow-800")}>
                      Estado del documento
                    </p>
                    {selectedDocument.status === 'aprobado' ? <CheckCircle className="h-5 w-5 text-green-400" /> : <FileClock className="h-5 w-5 text-yellow-400" />}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones de Revisión</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">
                      Motivo / Observaciones
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Describe el motivo del rechazo o solicitud de actualización..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleRequestUpdate}
                      disabled={processingAction || !rejectionReason.trim()}
                    >
                      {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Solicitar Actualización
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleRejectDocument}
                      disabled={processingAction || !rejectionReason.trim()}
                    >
                      {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Rechazar
                    </Button>
                    <Button 
                      onClick={handleApproveDocument}
                      disabled={processingAction}
                    >
                      {processingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Aprobar Documento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      )}

    </main>
    </Dialog>
  );
}
