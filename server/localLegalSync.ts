import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import admin from 'firebase-admin';

type SyncSource = 'agroambiental' | 'mingobierno' | 'tcp' | 'mintrabajo' | 'asfi' | 'tsj-resumenes' | 'agetic' | 'contraloria';
const execFileAsync = promisify(execFile);

async function runSyncCommand(action: string): Promise<unknown> {
  const args = [resolve(process.cwd(), 'scripts', 'sync-legal.ts'), action];
  try {
    const { stdout } = await execFileAsync(process.execPath, args, { cwd: process.cwd(), timeout: 90000, maxBuffer: 1000000 });
    return JSON.parse(stdout);
  } catch (error) {
    // The script exits nonzero for a failed source but still prints its recorded run.
    const stdout = (error as Error & { stdout?: string }).stdout;
    if (stdout) return JSON.parse(stdout);
    throw error;
  }
}

let syncing = false;
const respond = (response: ServerResponse, status: number, data: unknown) => {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(data));
};

function localRequest(request: IncomingMessage) {
  const host = request.headers.host || '';
  const address = request.socket.remoteAddress || '';
  const origin = request.headers.origin;
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)
    && (address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1')
    && !request.headers['x-forwarded-for'] && !request.headers['x-forwarded-host']
    && (!origin || origin === `http://${host}`);
}

async function officeAdminAuthorized(request: IncomingMessage) {
  // Demo users live only in the browser. This branch is restricted to the local
  // development server; real office users are verified with Firebase Admin below.
  if (request.headers['x-demo-admin'] === 'demo-jefe') return true;
  const studioToken = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const internalToken = request.headers['x-internal-token'];
  if (!studioToken || typeof internalToken !== 'string') return false;
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    admin.initializeApp(clientEmail && privateKey
      ? { credential: admin.credential.cert({ projectId, clientEmail, privateKey }) }
      : { projectId });
  }
  const studio = await admin.auth().verifyIdToken(studioToken, true);
  const internal = await admin.auth().verifyIdToken(internalToken, true);
  const profile = await admin.firestore().collection('users').doc(studio.uid).get();
  const workspaceId = profile.data()?.workspaceId;
  if (!workspaceId || internal.workspaceId !== workspaceId || internal.internalUserId !== internal.uid) return false;
  const workspace = await admin.firestore().collection('workspaces').doc(workspaceId).get();
  if (workspace.data()?.ownerUid !== studio.uid) return false;
  const caller = await workspace.ref.collection('internalUsers').doc(internal.uid).get();
  return caller.exists && caller.data()?.active === true && caller.data()?.isOfficeAdmin === true
    && caller.data()?.sessionVersion === internal.sessionVersion;
}

export async function handleLocalLegalSync(request: IncomingMessage, response: ServerResponse) {
  if (!localRequest(request)) { respond(response, 403, { error: 'La sincronización solo está disponible en localhost.' }); return; }
  try {
    if (!(await officeAdminAuthorized(request))) { respond(response, 403, { error: 'Solo el Admin del estudio puede sincronizar fuentes jurídicas.' }); return; }
    if (request.method === 'GET') { respond(response, 200, { sources: await runSyncCommand('status') }); return; }
    if (request.method !== 'POST') { respond(response, 405, { error: 'Método no permitido.' }); return; }
    if (syncing) { respond(response, 409, { error: 'Ya hay una sincronización en curso.' }); return; }
    let body = '';
    for await (const chunk of request) {
      body += chunk.toString();
      if (body.length > 1000) throw new Error('Solicitud demasiado extensa.');
    }
    const input = JSON.parse(body) as { source?: SyncSource };
    if (input.source !== 'agroambiental' && input.source !== 'mingobierno' && input.source !== 'tcp' && input.source !== 'mintrabajo' && input.source !== 'asfi' && input.source !== 'tsj-resumenes' && input.source !== 'agetic' && input.source !== 'contraloria') throw new Error('Fuente jurídica inválida.');
    syncing = true;
    try {
      const result = await runSyncCommand(input.source === 'mingobierno' ? 'normativa' : input.source) as { runs: unknown[] };
      respond(response, 200, { run: result.runs[0], sources: await runSyncCommand('status') });
    } finally { syncing = false; }
  } catch (error) {
    respond(response, 500, { error: error instanceof Error ? error.message : 'No se pudo sincronizar.' });
  }
}
