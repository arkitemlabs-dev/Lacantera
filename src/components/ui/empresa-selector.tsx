'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function EmpresaSelector() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  const empresaActual = session?.user?.empresaActual;
  const empresasDisponibles = session?.user?.empresasDisponibles || [];

  const cambiarEmpresa = async (tenantId: string) => {
    if (tenantId === empresaActual || isChanging) return;

    try {
      setIsChanging(true);

      // Actualizar sesión con NextAuth
      await update({
        empresaActual: tenantId,
      });

      // Recargar para aplicar cambios
      window.location.reload();
    } catch (error) {
      console.error('Error cambiando empresa:', error);
      alert('Error al cambiar de empresa. Por favor intente nuevamente.');
      setIsChanging(false);
    }
  };

  const empresaActualData = empresasDisponibles.find(
    (e) => e.tenantId === empresaActual
  );

  // Si está cargando
  if (status === 'loading') {
    return (
      <Button variant="ghost" className="flex items-center gap-2 h-auto p-2" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Cargando...</span>
      </Button>
    );
  }

  // Si no hay empresa seleccionada
  if (!empresaActualData) {
    return null;
  }

  // Si solo hay una empresa, mostrar sin dropdown
  if (empresasDisponibles.length <= 1) {
    return (
      <Button variant="ghost" className="flex items-center gap-2 h-auto p-2 cursor-default" disabled>
        <Building2 className="w-5 h-5" />
        <div className="text-left">
          <div className="text-sm font-medium">{empresaActualData.tenantName}</div>
          <div className="text-xs text-muted-foreground">{empresaActualData.empresaCodigo}</div>
        </div>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-auto p-2"
            disabled={isChanging}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-medium">{empresaActualData.tenantName}</div>
                <div className="text-xs text-muted-foreground">{empresaActualData.empresaCodigo}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Seleccionar Empresa</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-96 overflow-y-auto">
            {empresasDisponibles.map((empresa) => {
              const isSelected = empresa.tenantId === empresaActual;

              return (
                <DropdownMenuItem
                  key={empresa.tenantId}
                  onClick={() => cambiarEmpresa(empresa.tenantId)}
                  disabled={isChanging}
                  className={isSelected ? 'bg-muted' : ''}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Building2 className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {empresa.tenantName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Código: {empresa.empresaCodigo}
                        </div>
                        {empresa.proveedorCodigo && (
                          <div className="text-xs text-muted-foreground">
                            Proveedor: {empresa.proveedorCodigo}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading overlay */}
      {isChanging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">Cambiando empresa...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}