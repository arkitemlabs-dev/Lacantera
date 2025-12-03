'use client';

import { useState } from 'react';
import { Check, X, FileText, Download, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProveedorDocumento } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface DocumentoAprobacionProps {
  documento: ProveedorDocumento;
  onStatusChange: () => void;
}

export function DocumentoAprobacion({
  documento,
  onStatusChange,
}: DocumentoAprobacionProps) {
  const [comentarios, setComentarios] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showRechazarDialog, setShowRechazarDialog] = useState(false);
  const { toast } = useToast();

  const handleAprobar = async () => {
    try {
      setProcessing(true);

      const response = await fetch('/api/proveedores/documentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentoID: documento.documentoID,
          estatus: 'APROBADO',
          comentarios: comentarios || 'Documento aprobado',
        }),
      });

      if (!response.ok) {
        throw new Error('Error al aprobar documento');
      }

      toast({
        title: 'Documento aprobado',
        description: `El documento "${documento.nombreArchivo}" ha sido aprobado`,
      });

      setComentarios('');
      onStatusChange();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el documento',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRechazar = async () => {
    if (!comentarios.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar una razón para el rechazo',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch('/api/proveedores/documentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentoID: documento.documentoID,
          estatus: 'RECHAZADO',
          comentarios,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al rechazar documento');
      }

      toast({
        title: 'Documento rechazado',
        description: `El documento "${documento.nombreArchivo}" ha sido rechazado`,
      });

      setComentarios('');
      setShowRechazarDialog(false);
      onStatusChange();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo rechazar el documento',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (documento.estatus !== 'PENDIENTE') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Revisar Documento
        </CardTitle>
        <CardDescription>
          Aprueba o rechaza el documento subido por el proveedor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Proveedor</p>
            <p className="text-sm text-muted-foreground">{documento.proveedor}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Tipo de Documento</p>
            <p className="text-sm text-muted-foreground">
              {documento.tipoDocumento}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Nombre del Archivo</p>
            <p className="text-sm text-muted-foreground truncate">
              {documento.nombreArchivo}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Tamaño</p>
            <p className="text-sm text-muted-foreground">
              {(documento.archivoTamanio / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {documento.fechaVencimiento && (
            <div>
              <p className="text-sm font-medium">Fecha de Vencimiento</p>
              <p className="text-sm text-muted-foreground">
                {new Date(documento.fechaVencimiento).toLocaleDateString('es-MX')}
              </p>
            </div>
          )}
        </div>

        {/* Download Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(documento.archivoURL, '_blank')}
        >
          <Download className="h-4 w-4 mr-2" />
          Ver/Descargar Documento
        </Button>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="comentarios">Comentarios (opcional para aprobar)</Label>
          <Textarea
            id="comentarios"
            placeholder="Agrega comentarios sobre la revisión..."
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            rows={4}
            disabled={processing}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleAprobar}
            disabled={processing}
          >
            <Check className="h-4 w-4 mr-2" />
            Aprobar
          </Button>

          <Dialog open={showRechazarDialog} onOpenChange={setShowRechazarDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Rechazar Documento
                </DialogTitle>
                <DialogDescription>
                  Estás a punto de rechazar el documento. Esta acción notificará al
                  proveedor y requerirá que suba un nuevo documento.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="rechazo-comentarios">
                  Razón del rechazo (requerido) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rechazo-comentarios"
                  placeholder="Explica por qué se rechaza el documento..."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={4}
                  disabled={processing}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRechazarDialog(false)}
                  disabled={processing}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRechazar}
                  disabled={processing || !comentarios.trim()}
                >
                  <X className="h-4 w-4 mr-2" />
                  Confirmar Rechazo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
