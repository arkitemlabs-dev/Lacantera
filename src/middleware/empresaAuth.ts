'use client';

import { useAuth } from '@/app/providers';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { verificarAccesoEmpresa } from '@/app/actions/empresas';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useEmpresaAuth() {
  const { user } = useAuth();
  const { empresaSeleccionada } = useEmpresa();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verificarAcceso = async () => {
      if (!user || !empresaSeleccionada) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const result = await verificarAccesoEmpresa(user.uid, empresaSeleccionada.id);
        
        if (result.success && result.hasAccess) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          // Redirigir al login si no tiene acceso
          router.push('/login');
        }
      } catch (error) {
        console.error('Error verificando acceso:', error);
        setHasAccess(false);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verificarAcceso();
  }, [user, empresaSeleccionada, router]);

  return { loading, hasAccess };
}

// Componente HOC para proteger páginas
export function withEmpresaAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function EmpresaProtectedComponent(props: T) {
    const { loading, hasAccess } = useEmpresaAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Verificando acceso...</p>
        </div>
      );
    }

    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p>Sin acceso a esta empresa</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}