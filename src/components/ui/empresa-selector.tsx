'use client';

import { useSession } from 'next-auth/react';
import { Building2, Loader2 } from 'lucide-react';

export function EmpresaSelector() {
  const { data: session, status } = useSession();

  const empresaActual = session?.user?.empresaActual;
  const empresasDisponibles = session?.user?.empresasDisponibles || [];

  const empresaActualData = empresasDisponibles.find(
    (e) => e.tenantId === empresaActual
  );

  // Si está cargando
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 h-auto p-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    );
  }

  // Si no hay empresa seleccionada
  if (!empresaActualData) {
    return null;
  }

  // Mostrar solo la empresa actual (sin opción de cambio)
  // Para cambiar de empresa, el usuario debe cerrar sesión y volver a iniciar
  return (
    <div className="flex items-center gap-2 h-auto p-2">
      <Building2 className="w-5 h-5 text-muted-foreground" />
      <div className="text-left">
        <div className="text-sm font-medium">{empresaActualData.tenantName}</div>
        <div className="text-xs text-muted-foreground">{empresaActualData.empresaCodigo}</div>
      </div>
    </div>
  );
}