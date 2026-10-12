import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

type OfficeRole = 'abogado' | 'asistente';
const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 10 && value.length <= 128;
const validName = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100;
const reply = (res: VercelResponse, status: number, error: string) => res.status(status).json({ error });

function getAdmin() {
  if (admin.apps.length) return admin.app();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'abogadospro-fa495';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return admin.initializeApp(clientEmail && privateKey
    ? { credential: admin.credential.cert({ projectId, clientEmail, privateKey }) }
    : { projectId });
}

function publicUser(id: string, data: Record<string, unknown>) {
  return { id, displayName: data.displayName, role: data.role, isOfficeAdmin: data.isOfficeAdmin === true,
    active: data.active === true, email: data.email, sessionVersion: data.sessionVersion || 1, canRegisterExpenses: data.canRegisterExpenses === true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return reply(res, 405, 'Método no permitido.');
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return reply(res, 401, 'Se requiere la sesión del estudio.');
  let body: Record<string, unknown>;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; }
  catch { return reply(res, 400, 'Solicitud inválida.'); }
  try {
    const app = getAdmin();
    const auth = app.auth();
    const store = app.firestore();
    const studioToken = await auth.verifyIdToken(bearer, true);
    const studioProfile = await store.collection('users').doc(studioToken.uid).get();
    const workspaceId = studioProfile.data()?.workspaceId;
    if (!workspaceId || typeof workspaceId !== 'string') return reply(res, 403, 'Workspace inválido.');
    const workspaceRef = store.collection('workspaces').doc(workspaceId);
    const workspace = await workspaceRef.get();
    if (!workspace.exists || workspace.data()?.ownerUid !== studioToken.uid) return reply(res, 403, 'Se requiere la cuenta titular del estudio.');
    const users = workspaceRef.collection('internalUsers');
    const action = body.action;
    if (action === 'list') {
      const snapshot = await users.get();
      return res.status(200).json({ enabled: workspace.data()?.internalAuthEnabled === true,
        users: snapshot.docs.map(item => publicUser(item.id, item.data())) });
    }
    if (action === 'bootstrap') {
      if (process.env.INTERNAL_AUTH_RULES_READY !== 'true') return reply(res, 503, 'Activa y verifica primero las reglas de acceso interno.');
      if (workspace.data()?.internalAuthEnabled) return reply(res, 409, 'El estudio ya tiene usuarios internos.');
      if (!validPassword(body.password)) return reply(res, 400, 'La contraseña debe tener entre 10 y 128 caracteres.');
      const displayName = validName(body.displayName) ? body.displayName.trim() : studioProfile.data()?.displayName || 'Jefe del estudio';
      const record = await auth.createUser({ password: body.password, displayName, disabled: true });
      const email = `u-${record.uid.toLowerCase()}@internal.abogadospro.invalid`;
      try {
        await auth.updateUser(record.uid, { email });
        await auth.setCustomUserClaims(record.uid, { workspaceId, internalUserId: record.uid, officeRole: 'abogado', isOfficeAdmin: true, sessionVersion: 1 });
        await auth.updateUser(record.uid, { disabled: false });
        await store.runTransaction(async transaction => {
          const fresh = await transaction.get(workspaceRef);
          if (fresh.data()?.internalAuthEnabled === true) throw new Error('El estudio ya tiene usuarios internos.');
          transaction.create(users.doc(record.uid), { displayName, role: 'abogado', isOfficeAdmin: true, active: true, email, sessionVersion: 1, canRegisterExpenses: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
          transaction.update(workspaceRef, { internalAuthEnabled: true });
        });
        return res.status(201).json({ user: publicUser(record.uid, { displayName, role: 'abogado', isOfficeAdmin: true, active: true, email, sessionVersion: 1, canRegisterExpenses: true }) });
      } catch (error) { await auth.deleteUser(record.uid).catch(() => {}); throw error; }
    }
    if (workspace.data()?.internalAuthEnabled !== true) return reply(res, 409, 'Configura primero al Jefe.');
    const internalBearer = req.headers['x-internal-token'];
    if (typeof internalBearer !== 'string') return reply(res, 401, 'Se requiere una sesión interna.');
    const internalToken = await auth.verifyIdToken(internalBearer, true);
    if (internalToken.workspaceId !== workspaceId || internalToken.internalUserId !== internalToken.uid) return reply(res, 403, 'Sesión interna inválida.');
    const caller = await users.doc(internalToken.uid).get();
    if (!caller.exists || caller.data()?.active !== true || caller.data()?.sessionVersion !== internalToken.sessionVersion) return reply(res, 403, 'Usuario inactivo o sesión revocada.');
    if (action === 'me') return res.status(200).json({ user: publicUser(caller.id, caller.data()!) });
    if (caller.data()?.isOfficeAdmin !== true) return reply(res, 403, 'Solo el Jefe puede administrar usuarios.');
    if (action === 'create') {
      if (!validName(body.displayName) || !validPassword(body.password) || !['abogado', 'asistente'].includes(String(body.role))) return reply(res, 400, 'Datos de usuario inválidos.');
      const role = body.role as OfficeRole;
      const record = await auth.createUser({ password: body.password, displayName: body.displayName.trim(), disabled: true });
      const email = `u-${record.uid.toLowerCase()}@internal.abogadospro.invalid`;
      try {
        await auth.updateUser(record.uid, { email });
        await auth.setCustomUserClaims(record.uid, { workspaceId, internalUserId: record.uid, officeRole: role, isOfficeAdmin: false, sessionVersion: 1 });
        const data = { displayName: body.displayName.trim(), role, isOfficeAdmin: false, active: true, email, sessionVersion: 1, canRegisterExpenses: false, createdAt: admin.firestore.FieldValue.serverTimestamp() };
        await users.doc(record.uid).create(data);
        await auth.updateUser(record.uid, { disabled: false });
        return res.status(201).json({ user: publicUser(record.uid, data) });
      } catch (error) { await auth.deleteUser(record.uid).catch(() => {}); throw error; }
    }
    if (typeof body.userId !== 'string') return reply(res, 400, 'Usuario inválido.');
    const targetRef = users.doc(body.userId);
    const target = await targetRef.get();
    if (!target.exists) return reply(res, 404, 'Usuario no encontrado.');
    if (action === 'update') {
      const changes: Record<string, unknown> = {};
      if (body.displayName !== undefined) { if (!validName(body.displayName)) return reply(res, 400, 'Nombre inválido.'); changes.displayName = body.displayName.trim(); }
      if (body.role !== undefined) { if (!['abogado', 'asistente'].includes(String(body.role))) return reply(res, 400, 'Rol inválido.'); changes.role = body.role; }
      if (body.active !== undefined) { if (typeof body.active !== 'boolean') return reply(res, 400, 'Estado inválido.'); changes.active = body.active; }
      if (body.isOfficeAdmin !== undefined) { if (typeof body.isOfficeAdmin !== 'boolean') return reply(res, 400, 'Permiso inválido.'); changes.isOfficeAdmin = body.isOfficeAdmin; }
      if (body.canRegisterExpenses !== undefined) { if (typeof body.canRegisterExpenses !== 'boolean') return reply(res, 400, 'Permiso de gastos inválido.'); changes.canRegisterExpenses = body.canRegisterExpenses; }
      if (target.id === caller.id && (changes.active === false || changes.isOfficeAdmin === false)) return reply(res, 400, 'No puedes quitarte el acceso de Jefe.');
      if (!Object.keys(changes).length) return reply(res, 400, 'Sin cambios.');
      if (changes.role !== undefined || changes.isOfficeAdmin !== undefined) {
        const version = (target.data()?.sessionVersion || 1) + 1;
        changes.sessionVersion = version;
        await auth.setCustomUserClaims(target.id, {
          workspaceId, internalUserId: target.id,
          officeRole: changes.role || target.data()?.role,
          isOfficeAdmin: changes.isOfficeAdmin === undefined ? target.data()?.isOfficeAdmin === true : changes.isOfficeAdmin,
          sessionVersion: version,
        });
      }
      await targetRef.update(changes);
      if (changes.sessionVersion !== undefined) await auth.revokeRefreshTokens(target.id);
      if (changes.displayName) await auth.updateUser(target.id, { displayName: String(changes.displayName) });
      if (changes.active !== undefined) await auth.updateUser(target.id, { disabled: changes.active === false });
      if (changes.active === false) await auth.revokeRefreshTokens(target.id);
      return res.status(200).json({ user: publicUser(target.id, { ...target.data(), ...changes }) });
    }
    if (action === 'reset') {
      if (!validPassword(body.password)) return reply(res, 400, 'La contraseña debe tener entre 10 y 128 caracteres.');
      const version = (target.data()?.sessionVersion || 1) + 1;
      await auth.updateUser(target.id, { password: body.password });
      await auth.setCustomUserClaims(target.id, { workspaceId, internalUserId: target.id, officeRole: target.data()?.role, isOfficeAdmin: target.data()?.isOfficeAdmin === true, sessionVersion: version });
      await targetRef.update({ sessionVersion: version });
      await auth.revokeRefreshTokens(target.id);
      return res.status(200).json({ success: true });
    }
    return reply(res, 400, 'Acción desconocida.');
  } catch (error) {
    const code = (error as { code?: string }).code || '';
    if (code.startsWith('auth/id-token-') || code === 'auth/user-disabled' || code === 'auth/user-not-found') return reply(res, 401, 'La sesión expiró o fue revocada.');
    console.error('Internal auth request failed:', error);
    return reply(res, 500, 'No se pudo procesar la solicitud.');
  }
}
