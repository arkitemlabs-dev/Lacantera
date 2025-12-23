'use client';

import { useAuth } from '@/app/providers';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { MensajeriaInterface } from '@/components/mensajeria/MensajeriaInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function MensajeriaProveedorPage() {
  const { user, loading: authLoading } = useAuth();
  const { empresaSeleccionada, loading: empresaLoading } = useEmpresa();

  // Mostrar loader mientras se carga la autenticación
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

  // Para proveedores: usar empresa del contexto, o la empresa del usuario, o 'la-cantera' por defecto
  // Los proveedores generalmente trabajan con una sola empresa
  const empresaId = empresaSeleccionada?.codigo || user.empresaActual || user.empresa || 'la-cantera';

  // Debug: mostrar ID del usuario logueado
  console.log('🔐 Proveedor logueado - user.id:', user.id, '| user.email:', user.email, '| user.role:', user.role);

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Mensajería</h1>
        <p className="text-muted-foreground">
          Comunícate con el equipo de La Cantera
        </p>
      </div>

      <MensajeriaInterface
        usuarioId={user.id}
        usuarioNombre={user.name || user.email}
        usuarioRol={user.role || 'proveedor'}
        empresaId={empresaId}
      />
    </div>
  );
}
