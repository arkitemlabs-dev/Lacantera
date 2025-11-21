'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Empresa } from '@/lib/types';

type EmpresaContextType = {
  empresaSeleccionada: Empresa | null;
  setEmpresaSeleccionada: (empresa: Empresa | null) => void;
  empresasDisponibles: Empresa[];
  setEmpresasDisponibles: (empresas: Empresa[]) => void;
  loading: boolean;
};

const EmpresaContext = createContext<EmpresaContextType | null>(null);

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
};

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar empresa desde sessionStorage al inicializar
    const empresaGuardada = sessionStorage.getItem('empresaSeleccionada');
    if (empresaGuardada) {
      try {
        const empresa = JSON.parse(empresaGuardada);
        setEmpresaSeleccionada(empresa);
      } catch (error) {
        console.error('Error parsing empresa:', error);
        sessionStorage.removeItem('empresaSeleccionada');
      }
    }
    setLoading(false);
  }, []);

  const handleSetEmpresaSeleccionada = (empresa: Empresa | null) => {
    console.log('🏢 Estableciendo empresa:', empresa);
    setEmpresaSeleccionada(empresa);
    if (empresa) {
      sessionStorage.setItem('empresaSeleccionada', JSON.stringify(empresa));
      console.log('✅ Empresa guardada en sessionStorage:', empresa.nombreComercial);
    } else {
      sessionStorage.removeItem('empresaSeleccionada');
      console.log('🗑️ Empresa removida de sessionStorage');
    }
  };

  return (
    <EmpresaContext.Provider value={{
      empresaSeleccionada,
      setEmpresaSeleccionada: handleSetEmpresaSeleccionada,
      empresasDisponibles,
      setEmpresasDisponibles,
      loading
    }}>
      {children}
    </EmpresaContext.Provider>
  );
}