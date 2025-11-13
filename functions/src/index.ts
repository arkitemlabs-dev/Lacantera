import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Cloud Function para registrar usuario con rol
 */
export const registerUserWithRole = onCall(async (request) => {
  const { email, password, displayName, role, userType, empresa, rfc, razonSocial } = request.data;

  try {
    // Validaciones
    if (!email || !password || !role || !userType) {
      throw new HttpsError(
        'invalid-argument',
        'Faltan campos requeridos: email, password, role, userType'
      );
    }

    // Validar roles permitidos
    const allowedRoles = ['proveedor', 'admin_super', 'admin_compras'];
    if (!allowedRoles.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Rol no válido. Debe ser uno de: ${allowedRoles.join(', ')}`
      );
    }

    // Validar que password tenga al menos 6 caracteres
    if (password.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'La contraseña debe tener al menos 6 caracteres'
      );
    }

    // Crear usuario en Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    logger.info(`Usuario creado en Auth: ${userRecord.uid}`);

    // Preparar datos del documento
    const userData: any = {
      email: email,
      displayName: displayName,
      role: role,
      userType: userType,
      empresa: empresa,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    // Agregar campos específicos para proveedores
    if (userType === 'Proveedor' && role === 'proveedor') {
      userData.rfc = rfc || '';
      userData.razonSocial = razonSocial || '';
    }

    // Crear documento en Firestore
    await admin.firestore()
      .collection('users')
      .doc(userRecord.uid)
      .set(userData);

    logger.info(`Documento creado en Firestore: ${userRecord.uid}`);

    // Establecer custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: role,
      userType: userType
    });

    logger.info(`Custom claims establecidos para ${userRecord.uid}: ${role}`);

    return {
      success: true,
      uid: userRecord.uid,
      message: 'Usuario creado exitosamente'
    };

  } catch (error: any) {
    logger.error('Error al registrar usuario:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError(
        'already-exists',
        'El email ya está registrado'
      );
    }
    
    if (error.code === 'auth/invalid-email') {
      throw new HttpsError(
        'invalid-argument',
        'El email no es válido'
      );
    }
    
    throw new HttpsError(
      'internal',
      error.message || 'Error al crear usuario'
    );
  }
});

/**
 * Trigger cuando se crea un usuario en Firestore
 */
export const onUserCreate = onDocumentCreated('users/{userId}', async (event) => {
  const userData = event.data?.data();
  const userId = event.params.userId;

  if (!userData) {
    logger.error('No se encontraron datos del usuario');
    return;
  }

  try {
    await admin.auth().setCustomUserClaims(userId, {
      role: userData.role,
      userType: userData.userType
    });

    logger.info(`Custom claims establecidos para ${userId}: ${userData.role}`);
  } catch (error) {
    logger.error('Error al establecer custom claims:', error);
  }
});

/**
 * Actualizar rol de usuario (solo admin_super)
 */
export const updateUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (callerRole !== 'admin_super') {
    throw new HttpsError(
      'permission-denied',
      'Solo administradores super pueden actualizar roles'
    );
  }

  const { userId, newRole } = request.data;

  if (!userId || !newRole) {
    throw new HttpsError('invalid-argument', 'Faltan userId o newRole');
  }

  try {
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({ 
        role: newRole,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    await admin.auth().setCustomUserClaims(userId, {
      role: newRole
    });

    return { 
      success: true, 
      message: `Rol actualizado a ${newRole}` 
    };
    
  } catch (error: any) {
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Obtener datos de usuario
 */
export const getUserData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const { userId } = request.data;

  if (!userId) {
    throw new HttpsError('invalid-argument', 'Falta userId');
  }

  try {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    return {
      success: true,
      user: {
        uid: userId,
        ...userDoc.data()
      }
    };
  } catch (error: any) {
    throw new HttpsError('internal', error.message);
  }
});