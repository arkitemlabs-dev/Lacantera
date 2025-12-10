// src/app/select-empresa/page.tsx
// Página para seleccionar empresa al iniciar sesión

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function SelectEmpresaPage() {
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const empresasDisponibles = session?.user?.empresasDisponibles || [];
  const empresaActual = session?.user?.empresaActual;

  // Si ya tiene empresa seleccionada, redirigir al dashboard
  useEffect(() => {
    if (status === 'authenticated' && empresaActual) {
      router.push('/dashboard');
    }
  }, [status, empresaActual, router]);

  // Si no está autenticado, redirigir al login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleSelectEmpresa = async () => {
    if (!selectedTenant) return;

    try {
      setIsLoading(true);

      // Actualizar sesión
      await update({
        empresaActual: selectedTenant,
      });

      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error seleccionando empresa:', error);
      alert('Error al seleccionar empresa. Por favor intente nuevamente.');
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay empresas disponibles
  if (empresasDisponibles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sin Empresas Asignadas
          </h1>

          <p className="text-gray-600 mb-6">
            Su cuenta no tiene empresas asignadas. Por favor contacte al
            administrador para que le asigne acceso.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Seleccione una Empresa
          </h1>

          <p className="text-gray-600">
            Tiene acceso a {empresasDisponibles.length} empresa(s). Seleccione
            con cuál desea trabajar.
          </p>
        </div>

        {/* Cards de Empresas */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="divide-y divide-gray-200">
            {empresasDisponibles.map((empresa) => {
              const isSelected = selectedTenant === empresa.tenantId;

              return (
                <button
                  key={empresa.tenantId}
                  onClick={() => setSelectedTenant(empresa.tenantId)}
                  disabled={isLoading}
                  className={`w-full px-6 py-5 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-lg font-semibold truncate ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {empresa.tenantName}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Código: {empresa.empresaCodigo}
                        </span>

                        {empresa.proveedorCodigo && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Proveedor: {empresa.proveedorCodigo}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="ml-4">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón Continuar */}
        <div className="mt-6">
          <button
            onClick={handleSelectEmpresa}
            disabled={!selectedTenant || isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        {/* Info adicional */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Podrá cambiar de empresa más tarde desde el menú de navegación
          </p>
        </div>
      </div>
    </div>
  );
}
