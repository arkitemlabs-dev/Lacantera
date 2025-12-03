'use client';

import { useState } from 'react';
import { DocumentoUpload } from '@/components/proveedores/documento-upload';
import { DocumentosLista } from '@/components/proveedores/documentos-lista';
import { useEmpresa } from '@/hooks/use-empresa';
import { useSession } from 'next-auth/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ProveedoresDocumentosPage() {
  const { data: session } = useSession();
  const { empresaSeleccionada } = useEmpresa();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    // Trigger refresh of document list
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!session?.user?.name) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Debes iniciar sesión para acceder a esta página
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!empresaSeleccionada) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecciona una empresa para continuar
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Documentos del Proveedor
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y sube tus documentos requeridos
        </p>
      </div>

      {/* Upload Component */}
      <DocumentoUpload
        proveedor={session.user.name}
        empresa={empresaSeleccionada.codigo}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Documents List */}
      <DocumentosLista
        proveedor={session.user.name}
        empresa={empresaSeleccionada.codigo}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
