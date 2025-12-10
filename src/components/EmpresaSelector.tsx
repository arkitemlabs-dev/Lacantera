// src/components/EmpresaSelector.tsx
// Componente para seleccionar y cambiar entre empresas

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, ChevronDown, Check } from 'lucide-react';

export function EmpresaSelector() {
  const { data: session, update, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const empresaActual = session?.user?.empresaActual;
  const empresasDisponibles = session?.user?.empresasDisponibles || [];

  // Si solo hay una empresa, no mostrar selector
  if (empresasDisponibles.length <= 1) {
    const empresa = empresasDisponibles[0];
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">
          {empresa?.tenantName || 'Sin empresa asignada'}
        </span>
      </div>
    );
  }

  const cambiarEmpresa = async (tenantId: string) => {
    if (tenantId === empresaActual) {
      setIsOpen(false);
      return;
    }

    try {
      setIsChanging(true);

      // Actualizar sesión mediante NextAuth
      await update({
        empresaActual: tenantId,
      });

      // Cerrar dropdown
      setIsOpen(false);

      // Recargar página para refrescar datos
      window.location.reload();
    } catch (error) {
      console.error('Error cambiando empresa:', error);
      alert('Error al cambiar de empresa. Por favor intente nuevamente.');
    } finally {
      setIsChanging(false);
    }
  };

  const empresaActualData = empresasDisponibles.find(
    (e) => e.tenantId === empresaActual
  );

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <Building2 className="h-4 w-4 animate-pulse" />
        <span>Cargando...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-[200px] truncate">
          {empresaActualData?.tenantName || 'Seleccionar empresa'}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 z-20 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Seleccionar Empresa
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {empresasDisponibles.map((empresa) => {
                const isSelected = empresa.tenantId === empresaActual;

                return (
                  <button
                    key={empresa.tenantId}
                    onClick={() => cambiarEmpresa(empresa.tenantId)}
                    disabled={isChanging}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          {empresa.tenantName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Código: {empresa.empresaCodigo}
                        </p>
                        {empresa.proveedorCodigo && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Proveedor: {empresa.proveedorCodigo}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {empresasDisponibles.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No tiene empresas asignadas
              </div>
            )}
          </div>
        </>
      )}

      {/* Loading Overlay */}
      {isChanging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium text-gray-700">
                Cambiando empresa...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente compacto para mostrar solo la empresa actual (sin selector)
export function EmpresaDisplay() {
  const { data: session } = useSession();

  const empresaActual = session?.user?.empresaActual;
  const empresasDisponibles = session?.user?.empresasDisponibles || [];

  const empresaActualData = empresasDisponibles.find(
    (e) => e.tenantId === empresaActual
  );

  if (!empresaActualData) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Building2 className="h-4 w-4" />
      <span>{empresaActualData.tenantName}</span>
    </div>
  );
}
