'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Empresa, UsuarioEmpresa } from '@/lib/types';

export async function getEmpresasByUsuario(usuarioId: string) {
  try {
    // Obtener las empresas asignadas al usuario
    const usuarioEmpresasSnapshot = await adminDb
      .collection('usuarioEmpresas')
      .where('usuarioId', '==', usuarioId)
      .where('activo', '==', true)
      .get();

    if (usuarioEmpresasSnapshot.empty) {
      return {
        success: true,
        data: [],
        message: 'No hay empresas asignadas'
      };
    }

    const empresaIds = usuarioEmpresasSnapshot.docs.map(doc => doc.data().empresaId);

    // Obtener los datos de las empresas
    const empresasPromises = empresaIds.map(async (empresaId) => {
      const empresaDoc = await adminDb.collection('empresas').doc(empresaId).get();
      if (empresaDoc.exists) {
        return {
          id: empresaDoc.id,
          ...empresaDoc.data()
        } as Empresa;
      }
      return null;
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
    const docRef = await adminDb.collection('empresas').add({
      ...empresaData,
      fechaCreacion: new Date().toISOString(),
      activa: true
    });

    return {
      success: true,
      data: { id: docRef.id, ...empresaData }
    };

  } catch (error) {
    console.error('Error creando empresa:', error);
    return {
      success: false,
      error: 'Error al crear empresa'
    };
  }
}

export async function asignarUsuarioAEmpresa(usuarioId: string, empresaId: string, rol: string) {
  try {
    await adminDb.collection('usuarioEmpresas').add({
      usuarioId,
      empresaId,
      rol,
      activo: true,
      fechaAsignacion: new Date().toISOString()
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
    const snapshot = await adminDb
      .collection('usuarioEmpresas')
      .where('usuarioId', '==', usuarioId)
      .where('empresaId', '==', empresaId)
      .where('activo', '==', true)
      .get();

    return {
      success: true,
      hasAccess: !snapshot.empty,
      rol: snapshot.empty ? null : snapshot.docs[0].data().rol
    };

  } catch (error) {
    console.error('Error verificando acceso a empresa:', error);
    return {
      success: false,
      error: 'Error al verificar acceso'
    };
  }
}