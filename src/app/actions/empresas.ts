'use server';
// src/app/actions/empresas.ts

import { database } from '@/lib/database';
import type { Empresa, UsuarioEmpresa } from '@/lib/database/interface';
import { revalidatePath } from 'next/cache';

// ==================== OBTENER EMPRESAS ====================

export async function getEmpresasDisponibles() {
  try {
    const empresas = await database.getEmpresas({ activa: true });
    return { success: true, data: empresas };
  } catch (error: any) {
    console.error('Error obteniendo empresas:', error);
    return { success: false, error: error.message };
  }
}

export async function getEmpresasByUsuario(usuarioId: string) {
  try {
    // Obtener relaciones usuario-empresa
    const relaciones = await database.getEmpresasByUsuario(usuarioId);
    
    const empresas = [];
    for (const relacion of relaciones) {
      const empresa = await database.getEmpresa(relacion.empresaId);
      if (empresa && empresa.activa) {
        empresas.push(empresa);
      }
    }

    return { success: true, data: empresas };
  } catch (error: any) {
    console.error('Error obteniendo empresas del usuario:', error);
    return { success: false, error: error.message };
  }
}

export async function getEmpresaPorCodigo(codigo: string) {
  try {
    const empresa = await database.getEmpresaByCodigo(codigo);
    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }
    return { success: true, data: empresa };
  } catch (error: any) {
    console.error('Error obteniendo empresa:', error);
    return { success: false, error: error.message };
  }
}

// ==================== VALIDACIONES ====================

export async function validarAccesoEmpresa(usuarioId: string, empresaCodigo: string) {
  try {
    const empresa = await database.getEmpresaByCodigo(empresaCodigo);
    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    const relaciones = await database.getEmpresasByUsuario(usuarioId);
    const tieneAcceso = relaciones.find(r => r.empresaId === empresa.id && r.activo);

    if (!tieneAcceso) {
      return { 
        success: false, 
        error: 'No tiene acceso a esta empresa' 
      };
    }

    return { 
      success: true, 
      data: { 
        empresa,
        tieneAcceso: true 
      } 
    };
  } catch (error: any) {
    console.error('Error validando acceso a empresa:', error);
    return { success: false, error: error.message };
  }
}

// ==================== GESTIÓN DE RELACIONES USUARIO-EMPRESA ====================

export async function asignarEmpresaAUsuario(usuarioId: string, empresaId: string) {
  try {
    // Verificar que no exista ya la relación
    const relaciones = await database.getEmpresasByUsuario(usuarioId);
    const existeRelacion = relaciones.find(r => r.empresaId === empresaId && r.activo);
    
    if (existeRelacion) {
      return { success: false, error: 'El usuario ya tiene acceso a esta empresa' };
    }

    await database.createUsuarioEmpresa({
      usuarioId,
      empresaId,
      activo: true,
      createdAt: new Date()
    });

    revalidatePath('/admin/usuarios');
    revalidatePath('/admin/empresas');

    return { success: true, data: { message: 'Empresa asignada exitosamente' } };
  } catch (error: any) {
    console.error('Error asignando empresa:', error);
    return { success: false, error: error.message };
  }
}

export async function removerEmpresaDeUsuario(usuarioId: string, empresaId: string) {
  try {
    await database.updateUsuarioEmpresa(usuarioId, empresaId, { activo: false });

    revalidatePath('/admin/usuarios');
    revalidatePath('/admin/empresas');

    return { success: true, data: { message: 'Acceso a empresa removido' } };
  } catch (error: any) {
    console.error('Error removiendo empresa:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CREAR EMPRESAS (SUPER ADMIN) ====================

export async function createEmpresa(data: {
  codigo: string;
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
  configuracion?: Record<string, any>;
}) {
  try {
    // Verificar que el código no esté duplicado
    const empresaExistente = await database.getEmpresaByCodigo(data.codigo);
    if (empresaExistente) {
      return { success: false, error: 'Ya existe una empresa con este código' };
    }

    const empresaData = {
      ...data,
      activa: true,
      createdAt: new Date()
    };

    const id = await database.createEmpresa(empresaData);

    revalidatePath('/admin/empresas');

    return {
      success: true,
      data: { id, message: 'Empresa creada exitosamente' }
    };
  } catch (error: any) {
    console.error('Error creando empresa:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CONFIGURACIÓN POR EMPRESA ====================

export async function getConfiguracionEmpresa(empresaCodigo: string) {
  try {
    const empresa = await database.getEmpresaByCodigo(empresaCodigo);
    if (!empresa) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    return {
      success: true,
      data: {
        configuracion: empresa.configuracion || {},
        empresa: {
          codigo: empresa.codigo,
          razonSocial: empresa.razonSocial,
          nombreComercial: empresa.nombreComercial,
          logo: empresa.logo
        }
      }
    };
  } catch (error: any) {
    console.error('Error obteniendo configuración empresa:', error);
    return { success: false, error: error.message };
  }
}

// ==================== INICIALIZACIÓN DE DATOS ====================

export async function inicializarEmpresasDefault() {
  try {
    // Verificar si ya existen empresas
    const empresasExistentes = await database.getEmpresas();
    if (empresasExistentes.length > 0) {
      return { success: true, data: { message: 'Empresas ya inicializadas' } };
    }

    // Crear empresas por defecto
    const empresasDefault = [
      {
        codigo: 'LC',
        razonSocial: 'La Cantera Desarrollos Mineros S.A. de C.V.',
        nombreComercial: 'La Cantera',
        rfc: 'LCD123456789',
        email: 'admin@lacantera.com',
        activa: true,
        createdAt: new Date()
      },
      {
        codigo: 'SUB1',
        razonSocial: 'Subsidiaria Uno S.A. de C.V.',
        nombreComercial: 'Subsidiaria 1',
        rfc: 'SUB123456789',
        activa: true,
        createdAt: new Date()
      }
    ];

    const ids = [];
    for (const empresaData of empresasDefault) {
      const id = await database.createEmpresa(empresaData);
      ids.push(id);
    }

    return {
      success: true,
      data: { 
        message: 'Empresas inicializadas exitosamente',
        empresasCreadas: ids.length 
      }
    };

  } catch (error: any) {
    console.error('Error inicializando empresas:', error);
    return { success: false, error: error.message };
  }
}