'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function getAllEmpresas() {
  try {
    const snapshot = await adminDb
      .collection('empresas')
      .where('activa', '==', true)
      .get();

    const empresas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      data: empresas
    };

  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    return {
      success: false,
      error: 'Error al obtener empresas'
    };
  }
}