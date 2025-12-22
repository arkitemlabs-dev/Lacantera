'use client';

import { useAuth } from '@/app/providers';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { MensajeriaInterface } from '@/components/mensajeria/MensajeriaInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MensajeriaPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { empresaSeleccionada, loading: empresaLoading } = useEmpresa();

  // Mostrar loader mientras se carga la autenticación o empresa
  if (authLoading || empresaLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando mensajería...</p>
        </div>
      </div>
    );
  }

  // Validar que hay usuario autenticado
  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Debes iniciar sesión para acceder a la mensajería.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Para administradores, permitir acceso sin empresa seleccionada
  const esAdmin = userRole.name !== 'Proveedor';
  
  // Validar que hay empresa seleccionada (solo para proveedores)
  if (!esAdmin && !empresaSeleccionada) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Selecciona una empresa para acceder a la mensajería.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Mensajería</h1>
        <p className="text-muted-foreground">
          Comunícate con proveedores y equipo interno
        </p>
      </div>

      <MensajeriaInterface
        usuarioId={user.id}
        usuarioNombre={user.name || user.email}
        usuarioRol={userRole.name}
        empresaId={empresaSeleccionada?.codigo || 'admin-global'}
      />
    </div>
  );
}
