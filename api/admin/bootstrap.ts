import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'abogadospro-fa495';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return initializeApp({
    projectId,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  const { email } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || normalizedEmail !== 'admin@pachax.com') {
    return res.status(403).json({ error: 'Acceso no autorizado para bootstrap.' });
  }

  try {
    const adminApp = initAdmin();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    // Buscar usuario en Firebase Authentication
    const userRecord = await auth.getUserByEmail(normalizedEmail);
    const uid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // 1. Establecer custom claims en Firebase Auth
    await auth.setCustomUserClaims(uid, {
      role: 'admin',
      admin: true,
    });

    // 2. Establecer perfil oficial en Firestore (Fuente de verdad)
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const currentData = userDoc.exists ? userDoc.data() : {};

    const updatedProfile: Record<string, any> = {
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

    // 3. Preservar y asegurar workspace sin borrar datos
    const workspaceRef = firestore.collection('workspaces').doc(updatedProfile.workspaceId);
    const wsDoc = await workspaceRef.get();
    if (!wsDoc.exists) {
      await workspaceRef.set({
        id: updatedProfile.workspaceId,
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
    console.error('Error en bootstrap admin:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Error interno en bootstrap admin.',
    });
  }
}
