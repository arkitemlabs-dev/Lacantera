'use server';

import { database } from '@/lib/database';

export async function getAllEmpresas() {
  try {
    const empresas = await database.getEmpresas({ activa: true });

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