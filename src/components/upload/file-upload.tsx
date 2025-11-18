'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: Record<string, string[]>;
  maxSize?: number; // en bytes
  onFileSelect: (file: File) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  accept = {
    'application/pdf': ['.pdf'],
    'text/xml': ['.xml'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  label = 'Arrastra tu archivo aquí',
  description = 'o haz clic para seleccionar',
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError('');

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(`Archivo muy grande. Máximo ${maxSize / (1024 * 1024)}MB`);
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Tipo de archivo no permitido');
        } else {
          setError('Error al cargar el archivo');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [maxSize, onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setError('');
  };

  return (
    <div className={className}>
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Tamaño máximo: {maxSize / (1024 * 1024)}MB
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
