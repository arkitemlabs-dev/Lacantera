// src/app/admin/setup-empresas/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Building2, Loader2 } from 'lucide-react';
import { inicializarEmpresasDefault } from '@/app/actions/empresas';
import { useToast } from '@/hooks/use-toast';

export default function SetupEmpresasPage() {
  const [loading, setLoading] = useState(false);
  const [empresasCreadas, setEmpresasCreadas] = useState<number | null>(null);
  const { toast } = useToast();

  const handleInicializarEmpresas = async () => {
    setLoading(true);
    
    try {
      const result = await inicializarEmpresasDefault();
      
      if (result.success && result.data) {
        setEmpresasCreadas(result.data.empresasCreadas || 0);
        toast({
          title: 'Éxito',
          description: result.data.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error inicializando empresas:', error);
      toast({
        title: 'Error',
        description: 'Error al inicializar empresas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle>Configuración Inicial</CardTitle>
          <p className="text-muted-foreground text-sm">
            Configuración de empresas para el portal multiempresa
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {empresasCreadas !== null ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {empresasCreadas > 0 
                  ? `Se crearon ${empresasCreadas} empresas exitosamente.`
                  : 'Las empresas ya estaban inicializadas.'
                }
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Este proceso creará las siguientes empresas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>La Cantera</strong> (Código: LC)</li>
                  <li><strong>Subsidiaria 1</strong> (Código: SUB1)</li>
                </ul>
                <p className="text-xs">
                  Si las empresas ya existen, no se crearán duplicados.
                </p>
              </div>

              <Button 
                onClick={handleInicializarEmpresas}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Inicializando...
                  </>
                ) : (
                  'Inicializar Empresas'
                )}
              </Button>
            </>
          )}

          {empresasCreadas !== null && (
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => window.location.href = '/login'}
              >
                Ir al Login
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full" 
                onClick={() => {
                  setEmpresasCreadas(null);
                }}
              >
                Reinicializar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
