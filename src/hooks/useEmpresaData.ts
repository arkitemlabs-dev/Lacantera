'use client';

import { useCallback } from 'react';
import { useEmpresa } from '@/contexts/EmpresaContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryConstraint } from 'firebase/firestore';

export const useEmpresaData = () => {
  const { empresaSeleccionada } = useEmpresa();

  const obtenerDatos = useCallback(async (
    collectionName: string, 
    filtrosAdicionales: QueryConstraint[] = []
  ) => {
    if (!empresaSeleccionada) {
      throw new Error('No hay empresa seleccionada');
    }

    const q = query(
      collection(db, collectionName),
      where('empresaId', '==', empresaSeleccionada.id),
      ...filtrosAdicionales
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, [empresaSeleccionada]);

  const crearDocumento = useCallback(async (collectionName: string, data: any) => {
    if (!empresaSeleccionada) {
      throw new Error('No hay empresa seleccionada');
    }

    const docData = {
      ...data,
      empresaId: empresaSeleccionada.id,
      fechaCreacion: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, collectionName), docData);
    return { id: docRef.id, ...docData };
  }, [empresaSeleccionada]);

  const actualizarDocumento = useCallback(async (
    collectionName: string, 
    docId: string, 
    data: any
  ) => {
    const docRef = doc(db, collectionName, docId);
    const updateData = {
      ...data,
      fechaActualizacion: new Date().toISOString()
    };
    
    await updateDoc(docRef, updateData);
    return updateData;
  }, []);

  const eliminarDocumento = useCallback(async (collectionName: string, docId: string) => {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  }, []);

  return {
    empresaSeleccionada,
    obtenerDatos,
    crearDocumento,
    actualizarDocumento,
    eliminarDocumento
  };
};