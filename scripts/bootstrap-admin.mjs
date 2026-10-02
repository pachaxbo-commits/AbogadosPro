import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno locales si existen
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

function printHelp() {
  console.log(`
Uso de la herramienta de promoción administrativa:
  npm run admin -- --email <correo_del_usuario>
  o
  npm run admin -- --uid <uid_del_usuario>

Ejemplo:
  npm run admin -- --email admin@estudio.com
`);
}

async function main() {
  const args = process.argv.slice(2);
  let targetEmail = null;
  let targetUid = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      targetEmail = args[i + 1].trim().toLowerCase();
      i++;
    } else if (args[i] === '--uid' && args[i + 1]) {
      targetUid = args[i + 1].trim();
      i++;
    }
  }

  if (!targetEmail && !targetUid) {
    console.error('Error: Debe proporcionar --email o --uid para la promoción.');
    printHelp();
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'abogadospro-fa495';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.error(`
Error: No se encontraron las credenciales de Firebase Admin SDK.
Configure las siguientes variables en su archivo .env.local o entorno:
  FIREBASE_PROJECT_ID=${projectId}
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY=...
`);
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  const auth = admin.auth();
  const firestore = admin.firestore();

  let userRecord;
  try {
    if (targetEmail) {
      userRecord = await auth.getUserByEmail(targetEmail);
    } else {
      userRecord = await auth.getUser(targetUid);
    }
  } catch (_err) {
    console.error(`Error: No se encontró ningún usuario registrado en Authentication con ${targetEmail ? `email ${targetEmail}` : `UID ${targetUid}`}`);
    process.exit(1);
  }

  const uid = userRecord.uid;
  const email = userRecord.email;
  const nowIso = new Date().toISOString();

  console.log(`\nPromoviendo usuario a Administrador:`);
  console.log(`  UID:   ${uid}`);
  console.log(`  Email: ${email}`);

  // 1. Establecer custom claims en Firebase Auth (sincronización con token)
  await auth.setCustomUserClaims(uid, {
    role: 'admin',
    admin: true,
  });
  console.log('  + Custom Claims asignados: { role: "admin", admin: true }');

  // 2. Actualizar perfil en Firestore (Fuente de verdad de la aplicación)
  const userRef = firestore.collection('users').doc(uid);
  const userDoc = await userRef.get();

  const currentData = userDoc.exists ? userDoc.data() : {};
  const updatedProfile = {
    ...currentData,
    uid,
    email: email || currentData?.email || '',
    displayName: userRecord.displayName || currentData?.displayName || email?.split('@')[0] || 'Administrador',
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
  console.log('  + Perfil Firestore actualizado en users/' + uid);

  // 3. Asegurar workspace sin sobrescribir expedientes
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
    console.log('  + Workspace inicial creado en workspaces/' + updatedProfile.workspaceId);
  } else {
    await workspaceRef.set(
      {
        plan: 'admin',
        updatedAt: nowIso,
      },
      { merge: true }
    );
    console.log('  + Workspace preservado y actualizado en workspaces/' + updatedProfile.workspaceId);
  }

  console.log(`\n¡Éxito! El usuario ${email} ahora tiene rol de Administrador completo.\n`);
}

main().catch((e) => {
  console.error('Error fatal al promover administrador:', e);
  process.exit(1);
});
