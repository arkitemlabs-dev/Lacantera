'use server';

import {
  registerUser as registerUserHelper,
  updateUserRole as updateUserRoleHelper,
} from '@/lib/auth-helpers';

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: 'proveedor' | 'admin_super' | 'admin_compras';
  userType: 'Proveedor' | 'Administrador';
  empresa: string;
  rfc?: string;
  razonSocial?: string;
}

export async function registerUserWithRole(data: RegisterData) {
  return await registerUserHelper(data);
}

export async function updateUserRole(userId: string, newRole: string) {
  return await updateUserRoleHelper(userId, newRole);
}
