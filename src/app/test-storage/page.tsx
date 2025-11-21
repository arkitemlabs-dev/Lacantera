'use client';

import { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestStoragePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setDownloadUrl('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Crear referencia al archivo
      const storageRef = ref(storage, `test/${Date.now()}-${file.name}`);
      
      // Subir archivo
      await uploadBytes(storageRef, file);
      
      // Obtener URL de descarga
      const url = await getDownloadURL(storageRef);
      
      setDownloadUrl(url);
      alert('✅ Archivo subido exitosamente!');
    } catch (err: any) {
      console.error('Error subiendo archivo:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>🧪 Test Firebase Storage Emulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm"
            />
          </div>

          {file && (
            <div className="text-sm text-muted-foreground">
              Archivo seleccionado: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </Button>

          {error && (
            <div className="text-red-500 text-sm">
              ❌ Error: {error}
            </div>
          )}

          {downloadUrl && (
            <div className="space-y-2">
              <div className="text-green-600 font-semibold">
                ✅ Archivo subido exitosamente!
              </div>
              <div className="text-xs break-all bg-muted p-2 rounded">
                {downloadUrl}
              </div>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                Ver archivo
              </a>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-4">
            💡 Tip: Abre http://127.0.0.1:4000/storage para ver los archivos en el emulador
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
