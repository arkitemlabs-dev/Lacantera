// src/hooks/useProveedorAdmin.ts
// Hook personalizado para gestión de proveedores por admin usando SP

'use client';

import { useState, useCallback } from 'react';
import type { FormProveedorAdmin, ProveedorERP } from '@/types/admin-proveedores';

interface UseProveedorAdminReturn {
  // Estados
  proveedor: ProveedorERP | null;
  formData: FormProveedorAdmin | null;
  loading: boolean;
  error: string | null;
  saving: boolean;

  // Funciones
  consultarProveedor: (id: string, empresa?: string) => Promise<void>;
  consultarParaEdicion: (id: string, empresa?: string) => Promise<void>;
  crearProveedor: (data: FormProveedorAdmin) => Promise<boolean>;
  actualizarProveedor: (data: FormProveedorAdmin) => Promise<boolean>;
  limpiarEstado: () => void;
}

export function useProveedorAdmin(): UseProveedorAdminReturn {
  const [proveedor, setProveedor] = useState<ProveedorERP | null>(null);
  const [formData, setFormData] = useState<FormProveedorAdmin | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Consulta un proveedor para visualización (datos ERP completos)
   */
  const consultarProveedor = useCallback(async (id: string, empresa = 'la-cantera') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/proveedores/${encodeURIComponent(id)}?empresa=${empresa}&formato=erp`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al consultar proveedor');
      }

      const result = await response.json();
      setProveedor(result.data);
      
      console.log('[useProveedorAdmin] Proveedor consultado:', result.data.Nombre);
      
    } catch (err: any) {
      setError(err.message || 'Error desconocido al consultar proveedor');
      setProveedor(null);
      console.error('[useProveedorAdmin] Error en consultarProveedor:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Consulta un proveedor para edición (formato formulario)
   */
  const consultarParaEdicion = useCallback(async (id: string, empresa = 'la-cantera') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/proveedores/${encodeURIComponent(id)}?empresa=${empresa}&formato=form`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al consultar proveedor');
      }

      const result = await response.json();
      setFormData(result.data);
      
      console.log('[useProveedorAdmin] Proveedor listo para edición:', result.data.nombre);
      
    } catch (err: any) {
      setError(err.message || 'Error desconocido al consultar proveedor para edición');
      setFormData(null);
      console.error('[useProveedorAdmin] Error en consultarParaEdicion:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crea un nuevo proveedor
   */
  const crearProveedor = useCallback(async (data: FormProveedorAdmin): Promise<boolean> => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/proveedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear proveedor');
      }

      const result = await response.json();
      
      console.log('[useProveedorAdmin] Proveedor creado exitosamente:', data.nombre);
      
      // Limpiar formulario después de creación exitosa
      setFormData(null);
      
      return true;
      
    } catch (err: any) {
      setError(err.message || 'Error desconocido al crear proveedor');
      console.error('[useProveedorAdmin] Error en crearProveedor:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Actualiza un proveedor existente
   */
  const actualizarProveedor = useCallback(async (data: FormProveedorAdmin): Promise<boolean> => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/proveedores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar proveedor');
      }

      const result = await response.json();
      
      console.log('[useProveedorAdmin] Proveedor actualizado exitosamente:', data.nombre);
      
      return true;
      
    } catch (err: any) {
      setError(err.message || 'Error desconocido al actualizar proveedor');
      console.error('[useProveedorAdmin] Error en actualizarProveedor:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Limpia el estado del hook
   */
  const limpiarEstado = useCallback(() => {
    setProveedor(null);
    setFormData(null);
    setError(null);
  }, []);

  return {
    // Estados
    proveedor,
    formData,
    loading,
    error,
    saving,

    // Funciones
    consultarProveedor,
    consultarParaEdicion,
    crearProveedor,
    actualizarProveedor,
    limpiarEstado,
  };
}