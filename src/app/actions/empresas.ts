'use server';

import { database } from '@/lib/database';
import { Empresa, UsuarioEmpresa } from '@/lib/types';

export async function getEmpresasByUsuario(usuarioId: string) {
  try {
    // Obtener las empresas asignadas al usuario desde pNetUsuarioEmpresa
    const usuarioEmpresas = await database.getEmpresasByUsuario(usuarioId);

    if (usuarioEmpresas.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No hay empresas asignadas'
      };
    }

    // Obtener los datos completos de las empresas
    const empresasPromises = usuarioEmpresas.map(async (ue) => {
      return await database.getEmpresa(ue.empresaId);
    });

    const empresas = (await Promise.all(empresasPromises)).filter(Boolean) as Empresa[];

    return {
      success: true,
      data: empresas
    };

  } catch (error) {
    console.error('Error obteniendo empresas del usuario:', error);
    return {
      success: false,
      error: 'Error al obtener empresas'
    };
  }
}

export async function crearEmpresa(empresaData: Omit<Empresa, 'id'>) {
  try {
    // Crear empresa en la base de datos
    // NOTA: Esta función lanza error porque no se deben crear empresas desde el portal
    // Las empresas vienen del ERP
    const empresaId = await database.createEmpresa(empresaData);

    return {
      success: true,
      data: { id: empresaId, ...empresaData }
    };

  } catch (error) {
    console.error('Error creando empresa:', error);
    return {
      success: false,
      error: 'Las empresas deben ser creadas en el ERP, no en el portal'
    };
  }
}

export async function asignarUsuarioAEmpresa(usuarioId: string, empresaId: string, rol: string) {
  try {
    await database.createUsuarioEmpresa({
      usuarioId,
      empresaId,
      activo: true,
      createdAt: new Date(),
    });

    return {
      success: true,
      message: 'Usuario asignado a empresa correctamente'
    };

  } catch (error) {
    console.error('Error asignando usuario a empresa:', error);
    return {
      success: false,
      error: 'Error al asignar usuario a empresa'
    };
  }
}

export async function verificarAccesoEmpresa(usuarioId: string, empresaId: string) {
  try {
    const usuarioEmpresas = await database.getEmpresasByUsuario(usuarioId);
    const hasAccess = usuarioEmpresas.some(ue => ue.empresaId === empresaId && ue.activo);

    return {
      success: true,
      hasAccess,
      rol: hasAccess ? 'proveedor' : null
    };

  } catch (error) {
    console.error('Error verificando acceso a empresa:', error);
    return {
      success: false,
      error: 'Error al verificar acceso'
    };
  }
}