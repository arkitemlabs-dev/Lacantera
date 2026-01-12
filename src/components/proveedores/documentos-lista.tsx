'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Check, X, Clock, AlertCircle, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ProveedorDocumento } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface DocumentosListaProps {
  proveedor: string;
  empresa: string;
  refreshTrigger?: number;
}

const estatusConfig = {
  PENDIENTE: {
    icon: Clock,
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200',
  },
  APROBADO: {
    icon: Check,
    label: 'Aprobado',
    className: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  },
  RECHAZADO: {
    icon: X,
    label: 'Rechazado',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  },
  VENCIDO: {
    icon: AlertCircle,
    label: 'Vencido',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-200',
  },
};

export function DocumentosLista({
  proveedor,
  empresa,
  refreshTrigger = 0,
}: DocumentosListaProps) {
  const { data: session } = useSession();
  const [documentos, setDocumentos] = useState<ProveedorDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<ProveedorDocumento | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'update' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super-admin';

  useEffect(() => {
    fetchDocumentos();
  }, [proveedor, empresa, refreshTrigger]);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/proveedores/documentos?proveedor=${proveedor}&empresa=${empresa}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }

      const data = await response.json();
      setDocumentos(data.documentos);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async (action: 'aprobar' | 'rechazar' | 'solicitar_actualizacion') => {
    if (!selectedDoc) return;
    
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/proveedores/${proveedor}/documentos/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          motivo: actionReason.trim() || undefined
        })
      });
      
      if (response.ok) {
        await fetchDocumentos(); // Recargar documentos
        setActionDialog(null);
        setSelectedDoc(null);
        setActionReason('');
      }
    } catch (error) {
      console.error('Error en acción de documento:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openActionDialog = (doc: ProveedorDocumento, action: 'approve' | 'reject' | 'update') => {
    setSelectedDoc(doc);
    setActionDialog(action);
    setActionReason('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Cargando documentos...</p>
        </CardContent>
      </Card>
    );
  }

  if (documentos.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No hay documentos subidos aún
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos Subidos
        </CardTitle>
        <CardDescription>
          Total: {documentos.length} documento(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha Subida</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documentos.map((doc) => {
              const EstatusIcon = estatusConfig[doc.estatus].icon;

              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {doc.nombreArchivo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {doc.tipoDocumento}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(doc.fechaSubida), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {doc.fechaVencimiento ? (
                      <span className="text-sm">
                        {new Date(doc.fechaVencimiento).toLocaleDateString('es-MX')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={estatusConfig[doc.estatus].className}
                    >
                      <EstatusIcon className="h-3 w-3 mr-1" />
                      {estatusConfig[doc.estatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.archivoURL, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.archivoURL, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {doc.estatus !== 'APROBADO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionDialog(doc, 'approve')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {doc.estatus !== 'RECHAZADO' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openActionDialog(doc, 'reject')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openActionDialog(doc, 'update')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <RefreshCw className="h-4 w-4" />
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

        {documentos.some((d) => d.comentarios && d.estatus === 'RECHAZADO') && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Documentos con observaciones:</p>
            {documentos
              .filter((d) => d.comentarios && d.estatus === 'RECHAZADO')
              .map((doc) => (
                <div
                  key={doc.id}
                  className="text-sm p-3 bg-red-50 dark:bg-red-500/10 rounded-md"
                >
                  <p className="font-medium">{doc.nombreArchivo}</p>
                  <p className="text-muted-foreground mt-1">{doc.comentarios}</p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
      
      {/* Dialog para acciones de administrador */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' && 'Aprobar Documento'}
              {actionDialog === 'reject' && 'Rechazar Documento'}
              {actionDialog === 'update' && 'Solicitar Actualización'}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.nombreArchivo} - {selectedDoc?.tipoDocumento}
            </DialogDescription>
          </DialogHeader>
          
          {actionDialog !== 'approve' && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {actionDialog === 'reject' ? 'Motivo del rechazo' : 'Observaciones'}
              </Label>
              <Textarea
                id="reason"
                placeholder={actionDialog === 'reject' 
                  ? 'Describe el motivo del rechazo...' 
                  : 'Describe qué necesita actualizarse...'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (actionDialog === 'approve') handleDocumentAction('aprobar');
                if (actionDialog === 'reject') handleDocumentAction('rechazar');
                if (actionDialog === 'update') handleDocumentAction('solicitar_actualizacion');
              }}
              disabled={processing || (actionDialog !== 'approve' && !actionReason.trim())}
              variant={actionDialog === 'reject' ? 'destructive' : 'default'}
            >
              {processing && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              {actionDialog === 'approve' && 'Aprobar'}
              {actionDialog === 'reject' && 'Rechazar'}
              {actionDialog === 'update' && 'Solicitar Actualización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
