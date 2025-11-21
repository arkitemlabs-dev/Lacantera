'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getEmpresasByUsuario } from '@/app/actions/empresas';

interface Empresa {
  id: string;
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  logo?: string;
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  userType: 'Proveedor' | 'Administrador';
}

interface EmpresaSelectorProps {
  user: User;
  onEmpresaSelected: (empresa: Empresa) => void;
}

export default function EmpresaSelector({ user, onEmpresaSelected }: EmpresaSelectorProps) {
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    obtenerEmpresasUsuario();
  }, []);

  const obtenerEmpresasUsuario = async () => {
    try {
      const result = await getEmpresasByUsuario(user.uid);
      
      if (result.success) {
        setEmpresasDisponibles(result.data);
        
        // Si solo tiene una empresa, seleccionarla automáticamente
        if (result.data.length === 1) {
          const empresa = result.data[0];
          setEmpresaSeleccionada(empresa.codigo);
          setTimeout(() => handleContinuar(empresa), 1500);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudieron cargar las empresas disponibles',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = async (empresa?: Empresa) => {
    setProcessing(true);
    
    try {
      const empresaObj = empresa || empresasDisponibles.find(e => e.codigo === empresaSeleccionada);
      
      if (!empresaObj) {
        toast({
          title: 'Error',
          description: 'Debe seleccionar una empresa',
          variant: 'destructive',
        });
        return;
      }

      // Guardar en sessionStorage
      sessionStorage.setItem('empresaSeleccionada', JSON.stringify(empresaObj));
      
      // Callback para continuar
      onEmpresaSelected(empresaObj);
      
    } catch (error) {
      console.error('Error seleccionando empresa:', error);
      toast({
        title: 'Error',
        description: 'Error al seleccionar empresa',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">Seleccionar Empresa</CardTitle>
          <p className="text-muted-foreground text-sm">
            Hola <strong>{user.displayName}</strong>, selecciona la empresa con la que trabajarás
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {empresasDisponibles.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Sin empresas asignadas</h3>
              <p className="text-muted-foreground">
                Contacte al administrador para obtener acceso a las empresas
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/login'}>
                Volver al Login
              </Button>
            </div>
          ) : empresasDisponibles.length === 1 ? (
            <div className="text-center py-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-3 mb-2">
                  {empresasDisponibles[0].logo && (
                    <img 
                      src={empresasDisponibles[0].logo} 
                      alt={empresasDisponibles[0].nombreComercial}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <h3 className="font-medium">{empresasDisponibles[0].nombreComercial}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{empresasDisponibles[0].razonSocial}</p>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Redirigiendo automáticamente...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa:</label>
                <Select value={empresaSeleccionada} onValueChange={setEmpresaSeleccionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasDisponibles.map((empresa) => (
                      <SelectItem key={empresa.codigo} value={empresa.codigo}>
                        <div className="flex items-center gap-3">
                          {empresa.logo && (
                            <img 
                              src={empresa.logo} 
                              alt={empresa.nombreComercial}
                              className="w-6 h-6 rounded object-cover"
                            />
                          )}
                          <div className="text-left">
                            <div className="font-medium">{empresa.nombreComercial}</div>
                            <div className="text-xs text-muted-foreground">
                              {empresa.razonSocial}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => handleContinuar()} 
                className="w-full"
                disabled={!empresaSeleccionada || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook para usar en componentes
export function useEmpresaActual() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empresaGuardada = sessionStorage.getItem('empresaSeleccionada');
    if (empresaGuardada) {
      try {
        setEmpresa(JSON.parse(empresaGuardada));
      } catch (error) {
        console.error('Error parsing empresa:', error);
        sessionStorage.removeItem('empresaSeleccionada');
      }
    }
    setLoading(false);
  }, []);

  const cambiarEmpresa = () => {
    sessionStorage.removeItem('empresaSeleccionada');
    window.location.href = '/login';
  };

  return { empresa, cambiarEmpresa, loading };
}