import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getCleanPrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'abogadospro-fa495';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getCleanPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);

  if (clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  // Inicialización por defecto en caso de disponer de Application Default Credentials
  return admin.initializeApp({
    projectId,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  // 2. Encabezado de Autorización (Token Bearer)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Encabezado de autorización ausente o no válido.' });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Token de sesión vacío.' });
  }

  // 3. Validación de Payload antes de invocar operaciones
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // Fallback
    }
  }
  const { email, password, displayName, studioName } = body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'El correo electrónico proporcionado no tiene un formato válido.' });
  }

  if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre del titular es obligatorio y debe tener al menos 2 caracteres.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña provisional debe tener al menos 6 caracteres.' });
  }

  // 4. Inicialización segura de Firebase Admin SDK
  let adminApp: admin.app.App;
  try {
    adminApp = initAdmin();
  } catch (initErr) {
    console.error('Error al inicializar Firebase Admin:', initErr);
    return res.status(500).json({
      error: 'Credenciales de servicio administrativo de Firebase no configuradas en el servidor.',
    });
  }

  const auth = adminApp.auth();
  const firestore = adminApp.firestore();

  // 5. Verificación criptográfica del ID Token
  let decodedToken: admin.auth.DecodedIdToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Token de sesión expirado o inválido.' });
  }

  // 6. Verificación de permisos de Administrador en Firestore (Server-side)
  const callerUid = decodedToken.uid;

  try {
    const callerDoc = await firestore.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: solo los administradores pueden emitir cuentas de cortesía.' });
    }
  } catch (fsErr) {
    console.error('Error al consultar permisos de administrador en Firestore:', fsErr);
    return res.status(500).json({ error: 'Error al verificar privilegios administrativos.' });
  }

  // 7. Creación de cuenta Trial con rollback garantizado
  const normalizedEmail = email.trim().toLowerCase();
  const cleanDisplayName = displayName.trim();
  const cleanStudioName = typeof studioName === 'string' ? studioName.trim() : '';

  let createdAuthUid: string | null = null;

  try {
    // 7.1 Crear usuario en Firebase Auth sin afectar la sesión del admin
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      password,
      displayName: cleanDisplayName,
    });

    createdAuthUid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // 7.2 Crear perfil en Firestore
    const userProfile = {
      uid: createdAuthUid,
      email: normalizedEmail,
      displayName: cleanDisplayName,
      studioName: cleanStudioName,
      role: 'user',
      accountType: 'trial',
      plan: 'trial',
      billingExempt: true,
      subscriptionStatus: 'trialing',
      workspaceId: createdAuthUid,
      mustChangePassword: true,
      createdAt: nowIso,
    };

    await firestore.collection('users').doc(createdAuthUid).set(userProfile);

    // 7.3 Crear workspace aislado para el nuevo abogado
    await firestore.collection('workspaces').doc(createdAuthUid).set({
      id: createdAuthUid,
      name: cleanStudioName || cleanDisplayName,
      ownerUid: createdAuthUid,
      plan: 'trial',
      createdAt: nowIso,
    });

    return res.status(201).json({
      success: true,
      message: 'Cuenta de cortesía creada exitosamente.',
      user: {
        uid: createdAuthUid,
        email: normalizedEmail,
        displayName: cleanDisplayName,
        accountType: 'trial',
      },
    });
  } catch (creationError: unknown) {
    // Rollback: Si se creó el Auth User pero falló Firestore, eliminar Auth User
    if (createdAuthUid) {
      try {
        await auth.deleteUser(createdAuthUid);
        console.warn(`Rollback completado: usuario ${createdAuthUid} eliminado de Auth tras fallo en Firestore.`);
      } catch (rollbackError) {
        console.error(`Error crítico en rollback de usuario ${createdAuthUid}:`, rollbackError);
      }
    }

    const errCode = (creationError as { code?: string })?.code;
    if (errCode === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }

    console.error('Error durante la creación de cuenta de cortesía:', creationError);
    return res.status(500).json({ error: 'Ocurrió un error al procesar la creación de la cuenta.' });
  }
}
