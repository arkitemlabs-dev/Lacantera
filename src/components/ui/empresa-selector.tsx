'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, LogOut } from 'lucide-react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { useRouter } from 'next/navigation';

export function EmpresaSelector() {
  const { empresaSeleccionada, empresasDisponibles } = useEmpresa();
  const router = useRouter();

  const cambiarEmpresa = () => {
    // Limpiar empresa seleccionada y redirigir al login
    sessionStorage.removeItem('empresaSeleccionada');
    router.push('/login');
  };

  if (!empresaSeleccionada) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
          <div className="flex items-center gap-2">
            {empresaSeleccionada.logo ? (
              <img 
                src={empresaSeleccionada.logo} 
                alt={empresaSeleccionada.nombreComercial}
                className="w-6 h-6 rounded object-cover"
              />
            ) : (
              <Building2 className="w-5 h-5" />
            )}
            <div className="text-left">
              <div className="text-sm font-medium">{empresaSeleccionada.nombreComercial}</div>
              <div className="text-xs text-muted-foreground">{empresaSeleccionada.codigo}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Empresa Actual</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
            {empresaSeleccionada.logo ? (
              <img 
                src={empresaSeleccionada.logo} 
                alt={empresaSeleccionada.nombreComercial}
                className="w-8 h-8 rounded object-cover"
              />
            ) : (
              <Building2 className="w-8 h-8" />
            )}
            <div>
              <div className="font-medium text-sm">{empresaSeleccionada.nombreComercial}</div>
              <div className="text-xs text-muted-foreground">{empresaSeleccionada.razonSocial}</div>
            </div>
          </div>
        </div>

        {empresasDisponibles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={cambiarEmpresa} className="text-blue-600">
              <Building2 className="w-4 h-4 mr-2" />
              Cambiar Empresa
            </DropdownMenuItem>
          </>
        )}
        

      </DropdownMenuContent>
    </DropdownMenu>
  );
}