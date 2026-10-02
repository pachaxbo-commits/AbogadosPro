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
  if (admin.apps.length > 0) return admin.app();
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
  return admin.initializeApp({ projectId });
}

async function getIdTokenFromCustomToken(apiKey: string, customToken: string): Promise<string> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Error al intercambiar custom token: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCVjNKm-gzuvuOn0ErqNuUuYgUzq_e5ypE';

  const results: Record<string, any> = {};

  try {
    const adminApp = initAdmin();
    const auth = adminApp.auth();
    const firestore = adminApp.firestore();

    // 1. Obtener Token Real de Admin (admin@pachax.com)
    const adminUser = await auth.getUserByEmail('admin@pachax.com');
    const adminCustomToken = await auth.createCustomToken(adminUser.uid);
    const adminIdToken = await getIdTokenFromCustomToken(apiKey, adminCustomToken);

    // 2. Crear Usuario Normal Temporal para pruebas
    const normalEmail = `test-normal-${Date.now()}@pachax.test`;
    const normalUserRecord = await auth.createUser({
      email: normalEmail,
      password: 'TemporaryPassword123!',
      displayName: 'Usuario Normal Test',
    });
    const normalUid = normalUserRecord.uid;

    await firestore.collection('users').doc(normalUid).set({
      uid: normalUid,
      email: normalEmail,
      displayName: 'Usuario Normal Test',
      role: 'user',
      accountType: 'free',
      plan: 'free',
      billingExempt: false,
      workspaceId: normalUid,
      createdAt: new Date().toISOString(),
    });

    const normalCustomToken = await auth.createCustomToken(normalUid);
    const normalIdToken = await getIdTokenFromCustomToken(apiKey, normalCustomToken);

    const baseUrl = `https://${req.headers.host || 'abogadospro.vercel.app'}`;

    // Test A: Sin token -> debe dar 401
    const resA = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cualquiera@test.com', displayName: 'Test', password: 'password123' }),
    });
    results.caseA_sin_token = {
      status: resA.status,
      expected: 401,
      passed: resA.status === 401,
      response: await resA.json(),
    };

    // Test B: Token usuario normal -> debe dar 403
    const resB = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalIdToken}`,
      },
      body: JSON.stringify({ email: 'nuevo@test.com', displayName: 'Test', password: 'password123' }),
    });
    results.caseB_usuario_normal = {
      status: resB.status,
      expected: 403,
      passed: resB.status === 403,
      response: await resB.json(),
    };

    // Test D: Payload inválido con Token Admin -> debe dar 400
    const resD = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({ email: 'email-invalido', displayName: 'A', password: '123' }),
    });
    results.caseD_payload_invalido = {
      status: resD.status,
      expected: 400,
      passed: resD.status === 400,
      response: await resD.json(),
    };

    // Test C: Token Admin con payload válido -> debe crear Trial (201)
    const trialEmail = `test-trial-${Date.now()}@pachax.test`;
    const resC = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({
        email: trialEmail,
        displayName: 'Dra. Trial Temporal Test',
        studioName: 'Bufete Trial Test',
        password: 'PasswordTrial123!',
      }),
    });
    const bodyC = (await resC.json()) as any;
    results.caseC_admin_crea_trial = {
      status: resC.status,
      expected: 201,
      passed: resC.status === 201,
      response: bodyC,
    };

    const trialUid = bodyC.user?.uid;

    // Test E: Email duplicado con Token Admin -> debe dar 409
    const resE = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({
        email: trialEmail,
        displayName: 'Dra. Trial Duplicada',
        password: 'PasswordTrial123!',
      }),
    });
    results.caseE_email_duplicado = {
      status: resE.status,
      expected: 409,
      passed: resE.status === 409,
      response: await resE.json(),
    };

    // Verificación de los datos creados para el Trial en Firestore
    if (trialUid) {
      const trialDoc = await firestore.collection('users').doc(trialUid).get();
      const trialData = trialDoc.data();
      const wsDoc = await firestore.collection('workspaces').doc(trialUid).get();

      results.trial_verification = {
        userDocExists: trialDoc.exists,
        workspaceDocExists: wsDoc.exists,
        role: trialData?.role,
        accountType: trialData?.accountType,
        plan: trialData?.plan,
        billingExempt: trialData?.billingExempt,
        mustChangePassword: trialData?.mustChangePassword,
        passed:
          trialData?.role === 'user' &&
          trialData?.accountType === 'trial' &&
          trialData?.billingExempt === true &&
          trialData?.mustChangePassword === true,
      };

      // Simular cambio obligatorio de contraseña:
      await firestore.collection('users').doc(trialUid).update({
        mustChangePassword: false,
      });
      const updatedTrialDoc = await firestore.collection('users').doc(trialUid).get();
      results.trial_password_changed = {
        mustChangePassword: updatedTrialDoc.data()?.mustChangePassword,
        passed: updatedTrialDoc.data()?.mustChangePassword === false,
      };

      // Limpieza de cuenta Trial temporal
      await firestore.collection('workspaces').doc(trialUid).delete();
      await firestore.collection('users').doc(trialUid).delete();
      await auth.deleteUser(trialUid);
      results.trial_cleaned_up = true;
    }

    // Limpieza de usuario normal temporal
    await firestore.collection('users').doc(normalUid).delete();
    await auth.deleteUser(normalUid);
    results.normal_user_cleaned_up = true;

    // Resumen de estado de Admin
    const adminDoc = await firestore.collection('users').doc(adminUser.uid).get();
    results.admin_status = {
      uid: adminUser.uid,
      email: adminUser.email,
      role: adminDoc.data()?.role,
      accountType: adminDoc.data()?.accountType,
      billingExempt: adminDoc.data()?.billingExempt,
    };

    return res.status(200).json({
      success: true,
      message: 'Suite de pruebas end-to-end ejecutada con éxito.',
      results,
    });
  } catch (error: unknown) {
    console.error('Error en test-suite:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Error en test-suite.',
      results,
    });
  }
}
