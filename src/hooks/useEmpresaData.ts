'use client';

import { useCallback } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';

// TODO: Reescribir este hook para usar SQL Server en lugar de Firebase
// Por ahora está deshabilitado para evitar errores de build

export const useEmpresaData = () => {
  const { empresaSeleccionada } = useEmpresa();

  const obtenerDatos = useCallback(async (
    collectionName: string,
    filtrosAdicionales: any[] = []
  ) => {
    if (!empresaSeleccionada) {
      throw new Error('No hay empresa seleccionada');
    }

    // TODO: Implementar con SQL Server
    throw new Error('No implementado - migrar a SQL Server');
  }, [empresaSeleccionada]);

  const crearDocumento = useCallback(async (collectionName: string, data: any) => {
    if (!empresaSeleccionada) {
      throw new Error('No hay empresa seleccionada');
    }

    // TODO: Implementar con SQL Server
    throw new Error('No implementado - migrar a SQL Server');
  }, [empresaSeleccionada]);

  const actualizarDocumento = useCallback(async (
    collectionName: string,
    docId: string,
    data: any
  ) => {
    // TODO: Implementar con SQL Server
    throw new Error('No implementado - migrar a SQL Server');
  }, []);

  const eliminarDocumento = useCallback(async (collectionName: string, docId: string) => {
    // TODO: Implementar con SQL Server
    throw new Error('No implementado - migrar a SQL Server');
  }, []);

  return {
    empresaSeleccionada,
    obtenerDatos,
    crearDocumento,
    actualizarDocumento,
    eliminarDocumento
  };
};