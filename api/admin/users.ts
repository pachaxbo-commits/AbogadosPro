import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Inicialización segura de Firebase Admin SDK (Singleton)
if (!admin.apps.length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || 'abogadospro-fa495';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Inicialización por defecto para entornos con credenciales de aplicación
    admin.initializeApp({
      projectId,
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir solicitudes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Encabezado de autorización ausente o no válido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Token de sesión expirado o inválido.' });
    }

    const callerUid = decodedToken.uid;

    // Verificar en Firestore que el solicitante tenga rol de 'admin'
    const firestore = admin.firestore();
    const callerDoc = await firestore.collection('users').doc(callerUid).get();
    
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo los administradores pueden crear cuentas de cortesía.' });
    }

    const { email, password, displayName, studioName } = req.body || {};

    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Faltan campos requeridos: email, password, displayName.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña provisional debe tener al menos 6 caracteres.' });
    }

    // 1. Crear el usuario en Firebase Authentication sin alterar la sesión del Admin
    const userRecord = await admin.auth().createUser({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
    });

    const newUid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // 2. Crear el documento del usuario en Firestore (Trial, Cortesía, cambio de contraseña obligatorio)
    const userProfile = {
      uid: newUid,
      email: email.trim(),
      displayName: displayName.trim(),
      studioName: studioName?.trim() || '',
      role: 'user',
      accountType: 'trial',
      plan: 'trial',
      billingExempt: true,
      subscriptionStatus: 'trialing',
      workspaceId: newUid,
      mustChangePassword: true,
      createdAt: nowIso,
    };

    await firestore.collection('users').doc(newUid).set(userProfile);

    // 3. Crear el workspace aislado para el nuevo abogado
    await firestore.collection('workspaces').doc(newUid).set({
      id: newUid,
      name: studioName?.trim() || displayName.trim(),
      ownerUid: newUid,
      plan: 'trial',
      createdAt: nowIso,
    });

    return res.status(201).json({
      success: true,
      message: 'Cuenta de cortesía creada exitosamente.',
      user: {
        uid: newUid,
        email: email.trim(),
        displayName: displayName.trim(),
        accountType: 'trial',
      },
    });
  } catch (error: unknown) {
    console.error('Error en API /api/admin/users:', error);
    const errMessage = error instanceof Error ? error.message : 'Error interno al crear usuario.';
    return res.status(500).json({ error: errMessage });
  }
}
