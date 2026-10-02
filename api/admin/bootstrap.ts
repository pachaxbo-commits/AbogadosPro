import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

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
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (certErr) {
      console.error('Error inicializando admin.credential.cert:', certErr);
      throw new Error(`Fallo en cert(): ${certErr instanceof Error ? certErr.message : String(certErr)}`);
    }
  }

  return admin.initializeApp({
    projectId,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Ignorar si no es JSON
      }
    }

    const { email } = body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || normalizedEmail !== 'admin@pachax.com') {
      return res.status(403).json({ error: 'Acceso no autorizado para bootstrap.' });
    }

    let adminApp: admin.app.App;
    try {
      adminApp = initAdmin();
    } catch (initErr) {
      return res.status(500).json({
        error: `Error al inicializar Firebase Admin: ${initErr instanceof Error ? initErr.message : String(initErr)}`,
      });
    }

    const auth = adminApp.auth();
    const firestore = adminApp.firestore();

    // Buscar usuario en Firebase Authentication
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail);
    } catch (userErr) {
      return res.status(404).json({
        error: `Usuario no encontrado en Firebase Auth: ${userErr instanceof Error ? userErr.message : String(userErr)}`,
      });
    }

    const uid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // 1. Establecer custom claims en Firebase Auth
    await auth.setCustomUserClaims(uid, {
      role: 'admin',
      admin: true,
    });

    // 2. Establecer perfil oficial en Firestore
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const currentData = userDoc.exists ? userDoc.data() : {};

    const updatedProfile: Record<string, unknown> = {
      ...currentData,
      uid,
      email: normalizedEmail,
      displayName: userRecord.displayName || currentData?.displayName || 'Administrador Pachax',
      role: 'admin',
      accountType: 'admin',
      plan: 'admin',
      billingExempt: true,
      workspaceId: currentData?.workspaceId || uid,
      updatedAt: nowIso,
    };

    if (!userDoc.exists) {
      updatedProfile.createdAt = nowIso;
    }

    await userRef.set(updatedProfile, { merge: true });

    // 3. Preservar workspace sin borrar datos
    const workspaceId = String(updatedProfile.workspaceId);
    const workspaceRef = firestore.collection('workspaces').doc(workspaceId);
    const wsDoc = await workspaceRef.get();
    if (!wsDoc.exists) {
      await workspaceRef.set({
        id: workspaceId,
        name: updatedProfile.displayName,
        ownerUid: uid,
        plan: 'admin',
        createdAt: nowIso,
      });
    } else {
      await workspaceRef.set(
        {
          plan: 'admin',
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Administrador promovido exitosamente.',
      admin: {
        uid,
        email: normalizedEmail,
        role: 'admin',
        accountType: 'admin',
        billingExempt: true,
      },
    });
  } catch (err: unknown) {
    console.error('Error general en bootstrap:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error inesperado en servidor.',
    });
  }
}
