'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface DocumentoUploadProps {
  proveedor: string;
  empresa: string;
  tiposDocumento: Array<{
    codigo: string;
    nombre: string;
    descripcion?: string;
  }>;
  onUploadSuccess?: () => void;
}

export function DocumentoUpload({
  proveedor,
  empresa,
  tiposDocumento,
  onUploadSuccess,
}: DocumentoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'El archivo no debe superar 10MB',
          variant: 'destructive',
        });
        return;
      }

      // Validar tipo de archivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Error',
          description: 'Solo se permiten archivos PDF, JPG o PNG',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !tipoDocumento) {
      toast({
        title: 'Error',
        description: 'Selecciona un archivo y tipo de documento',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      // Subir archivo real via FormData a Azure Blob Storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('tipoDocumento', tipoDocumento);
      formData.append('empresa', empresa);
      formData.append('proveedor', proveedor);

      const response = await fetch('/api/proveedor/documentos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir documento');
      }

      toast({
        title: 'Éxito',
        description: 'Documento subido correctamente',
      });

      // Limpiar formulario
      setSelectedFile(null);
      setTipoDocumento('');

      // Llamar callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Documento
        </CardTitle>
        <CardDescription>
          Sube los documentos requeridos para tu registro como proveedor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tipo-documento">Tipo de Documento</Label>
          <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
            <SelectTrigger id="tipo-documento">
              <SelectValue placeholder="Selecciona el tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              {tiposDocumento.map((tipo) => (
                <SelectItem key={tipo.codigo} value={tipo.codigo}>
                  {tipo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tipoDocumento && (
            <p className="text-sm text-muted-foreground">
              {tiposDocumento.find((t) => t.codigo === tipoDocumento)?.descripcion}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="archivo">Archivo</Label>
          <div className="flex items-center gap-2">
            <input
              id="archivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <span>({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Formatos permitidos: PDF, JPG, PNG. Tamaño máximo: 10MB
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !tipoDocumento || uploading}
          className="w-full"
        >
          {uploading ? 'Subiendo...' : 'Subir Documento'}
        </Button>
      </CardContent>
    </Card>
  );
}
