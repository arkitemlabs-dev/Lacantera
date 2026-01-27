// src/components/admin/FormularioProveedor.tsx
// Ejemplo de componente para crear/editar proveedores usando SP

'use client';

import React, { useState, useEffect } from 'react';
import { useProveedorAdmin } from '@/hooks/useProveedorAdmin';
import type { FormProveedorAdmin } from '@/types/admin-proveedores';

interface Props {
  modo: 'crear' | 'editar';
  proveedorId?: string; // RFC, código o nombre para buscar (modo editar)
  empresa?: string;
  onGuardado?: (success: boolean) => void;
  onCancelar?: () => void;
}

export function FormularioProveedor({
  modo,
  proveedorId,
  empresa = 'la-cantera',
  onGuardado,
  onCancelar
}: Props) {
  const {
    formData,
    loading,
    error,
    saving,
    consultarParaEdicion,
    crearProveedor,
    actualizarProveedor,
    limpiarEstado
  } = useProveedorAdmin();

  // Estado local del formulario
  const [datos, setDatos] = useState<FormProveedorAdmin>({
    nombre: '',
    rfc: '',
    empresa: empresa,
    activo: true,
    // ... otros campos opcionales
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar datos para edición
  useEffect(() => {
    if (modo === 'editar' && proveedorId) {
      consultarParaEdicion(proveedorId, empresa);
    }

    return () => {
      limpiarEstado();
    };
  }, [modo, proveedorId, empresa, consultarParaEdicion, limpiarEstado]);

  // Actualizar formulario cuando se cargan los datos
  useEffect(() => {
    if (formData) {
      setDatos(formData);
    }
  }, [formData]);

  // Manejar cambios en inputs
  const handleInputChange = (field: keyof FormProveedorAdmin, value: string | number | boolean) => {
    setDatos(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let success = false;
    if (modo === 'crear') {
      success = await crearProveedor(datos);
    } else {
      success = await actualizarProveedor(datos);
    }

    if (success) {
      setShowSuccess(true);
      // Ocultar mensaje después de 3 segundos
      setTimeout(() => setShowSuccess(false), 3000);
    }

    if (onGuardado) {
      onGuardado(success);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando datos del proveedor...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {modo === 'crear' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
          </h2>
          {modo === 'editar' && proveedorId && (
            <p className="text-sm text-gray-600 mt-1">
              Editando: {proveedorId}
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {showSuccess && (
          <div className="p-4 bg-green-50 border-l-4 border-green-400">
            <p className="text-green-700 font-medium">
              ✅ {modo === 'crear' ? 'Proveedor creado' : 'Cambios guardados'} exitosamente
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={datos.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Razón social del proveedor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                RFC *
              </label>
              <input
                type="text"
                required
                value={datos.rfc}
                onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="RFC del proveedor"
                pattern="^[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}$"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre Corto
              </label>
              <input
                type="text"
                value={datos.nombreCorto || ''}
                onChange={(e) => handleInputChange('nombreCorto', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre abreviado"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                CURP
              </label>
              <input
                type="text"
                value={datos.curp || ''}
                onChange={(e) => handleInputChange('curp', e.target.value.toUpperCase())}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="CURP del representante"
                maxLength={18}
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Calle y número
                </label>
                <input
                  type="text"
                  value={datos.direccion || ''}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Calle principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número exterior
                </label>
                <input
                  type="text"
                  value={datos.numeroExterior || ''}
                  onChange={(e) => handleInputChange('numeroExterior', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número interior
                </label>
                <input
                  type="text"
                  value={datos.numeroInterior || ''}
                  onChange={(e) => handleInputChange('numeroInterior', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Colonia
                </label>
                <input
                  type="text"
                  value={datos.colonia || ''}
                  onChange={(e) => handleInputChange('colonia', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={datos.ciudad || ''}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <input
                  type="text"
                  value={datos.estado || ''}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código Postal
                </label>
                <input
                  type="text"
                  value={datos.codigoPostal || ''}
                  onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  pattern="^[0-9]{5}$"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email principal
                </label>
                <input
                  type="email"
                  value={datos.email1 || ''}
                  onChange={(e) => handleInputChange('email1', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Teléfonos
                </label>
                <input
                  type="text"
                  value={datos.telefonos || ''}
                  onChange={(e) => handleInputChange('telefonos', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Teléfono(s) de contacto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contacto principal
                </label>
                <input
                  type="text"
                  value={datos.contactoPrincipal || ''}
                  onChange={(e) => handleInputChange('contactoPrincipal', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del contacto"
                />
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancelar}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                modo === 'crear' ? 'Crear Proveedor' : 'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}