
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase'; // Assuming you have a firebase config file
import { z } from 'zod';

// Zod schema for supplier data validation
const supplierSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  taxId: z.string().min(10, 'El RFC/Tax ID es requerido'),
  address: z.string().min(5, 'La dirección es requerida'),
  contactName: z.string().min(2, 'El nombre del contacto es requerido'),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  bankName: z.string().min(2, 'El nombre del banco es requerido'),
  bankAccount: z.string().min(10, 'La cuenta bancaria es requerida'),
  bankClabe: z.string().length(18, 'La CLABE debe tener 18 dígitos'),
  supplierType: z.enum(['supplies', 'services', 'leasing', 'transport']),
  description: z.string().optional(),
});

type Supplier = z.infer<typeof supplierSchema>;

const suppliersCollection = collection(db, 'suppliers');

// Function to add a new supplier
export const addSupplier = async (supplierData: Supplier) => {
  try {
    const validatedData = supplierSchema.parse(supplierData);
    const docRef = await addDoc(suppliersCollection, validatedData);
    console.log('Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e;
  }
};

// Function to get all suppliers
export const getSuppliers = async () => {
  const querySnapshot = await getDocs(suppliersCollection);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Function to get a single supplier by ID
export const getSupplier = async (id: string) => {
  const docRef = doc(db, 'suppliers', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    throw new Error('No such document!');
  }
};

// Function to update a supplier
export const updateSupplier = async (id: string, updatedData: Partial<Supplier>) => {
  const docRef = doc(db, 'suppliers', id);
  await updateDoc(docRef, updatedData);
};

// Function to delete a supplier
export const deleteSupplier = async (id: string) => {
  const docRef = doc(db, 'suppliers', id);
await deleteDoc(docRef);
};
