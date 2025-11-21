'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Verificar si Firebase Admin está disponible
const isAdminAvailable = () => {
  return adminAuth && adminDb && process.env.NODE_ENV !== 'development';
};

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
  try {
    // Verificar si Firebase Admin está disponible
    if (!adminAuth || !adminDb) {
      console.log('⚠️ Firebase Admin no disponible');
      return {
        success: false,
        message: 'Error de configuración del servidor. Contacte al administrador.',
      };
    }

    // Validaciones
    if (!data.email || !data.password || !data.role || !data.userType) {
      return {
        success: false,
        message: 'Faltan campos requeridos'
      };
    }

    // Validar roles permitidos
    const allowedRoles = ['proveedor', 'admin_super', 'admin_compras'];
    if (!allowedRoles.includes(data.role)) {
      return {
        success: false,
        message: 'Rol no válido'
      };
    }

    // Validar longitud de contraseña
    if (data.password.length < 6) {
      return {
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      };
    }

    // Crear usuario en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      emailVerified: false,
    });

    console.log(`✅ Usuario creado en Auth: ${userRecord.uid}`);

    // Preparar datos para Firestore
    const userData: any = {
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      userType: data.userType,
      empresa: data.empresa,
      createdAt: new Date(),
      isActive: true,
    };

    // Agregar campos específicos para proveedores
    if (data.userType === 'Proveedor' && data.role === 'proveedor') {
      userData.rfc = data.rfc || '';
      userData.razonSocial = data.razonSocial || '';
    }

    // Guardar en Firestore
    await adminDb.collection('users').doc(userRecord.uid).set(userData);

    console.log(`✅ Documento creado en Firestore: ${userRecord.uid}`);

    // Establecer custom claims (CLAVE para roles)
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: data.role,
      userType: data.userType,
    });

    console.log(`✅ Custom claims establecidos: ${data.role}`);

    return {
      success: true,
      uid: userRecord.uid,
      message: 'Usuario creado exitosamente',
    };

  } catch (error: any) {
    console.error('❌ Error al registrar usuario:', error);

    // Manejar errores específicos
    if (error.code === 'auth/email-already-exists') {
      return {
        success: false,
        message: 'El email ya está registrado',
      };
    }

    if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'El email no es válido',
      };
    }

    return {
      success: false,
      message: error.message || 'Error al crear usuario',
    };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    // Verificar si Firebase Admin está disponible
    if (!isAdminAvailable()) {
      console.log('⚠️ Firebase Admin no disponible en desarrollo');
      return {
        success: false,
        message: 'Actualización de roles no disponible en modo desarrollo.',
      };
    }

    // Actualizar en Firestore
    await adminDb.collection('users').doc(userId).update({
      role: newRole,
      updatedAt: new Date(),
    });

    // Actualizar custom claims
    await adminAuth.setCustomUserClaims(userId, {
      role: newRole,
    });

    return {
      success: true,
      message: 'Rol actualizado exitosamente',
    };

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error al actualizar rol',
    };
  }
}