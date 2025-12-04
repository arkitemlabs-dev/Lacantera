// src/app/admin/setup-empresas/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Info } from 'lucide-react';

export default function SetupEmpresasPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle>Gestión de Empresas</CardTitle>
          <p className="text-muted-foreground text-sm">
            Portal multiempresa - La Cantera
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Las empresas se gestionan directamente desde el sistema ERP (pNet).
              No es necesario crear empresas desde este portal.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Configuración automática:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Las empresas provienen de la tabla <code>pNetEmpresa</code></li>
              <li>Los usuarios se asignan a empresas mediante <code>pNetUsuarioEmpresa</code></li>
              <li>Los proveedores se vinculan automáticamente</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Ir al Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
