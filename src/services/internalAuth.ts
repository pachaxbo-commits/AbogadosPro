import { initializeApp, getApps } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { auth, firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

export const officeAuthEnabled = import.meta.env.VITE_INTERNAL_AUTH_ENABLED === 'true';
export type OfficeRole = 'abogado' | 'asistente';
export type OfficeUser = { id: string; displayName: string; photoUrl?: string; role: OfficeRole; isOfficeAdmin: boolean; active: boolean; email: string; sessionVersion: number; canRegisterExpenses: boolean };
const secondaryApp = isFirebaseConfigured()
  ? getApps().find(app => app.name === 'abogadospro-internal') || initializeApp(firebaseConfig, 'abogadospro-internal')
  : null;
export const internalAuth = secondaryApp ? getAuth(secondaryApp) : null;
export const internalDb = secondaryApp ? getFirestore(secondaryApp) : null;
let persistenceReady: Promise<void> | null = null;

export async function officeRequest<T>(action: string, data: Record<string, unknown> = {}, internalUser?: User | null): Promise<T> {
  if (!auth?.currentUser) throw new Error('Inicia sesión en el estudio.');
  const studioToken = await auth.currentUser.getIdToken();
  const token = internalUser ? await internalUser.getIdToken() : null;
  const response = await fetch('/api/internal', { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${studioToken}`,
    ...(token ? { 'x-internal-token': token } : {}),
  }, body: JSON.stringify({ action, ...data }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo procesar la solicitud.');
  return result as T;
}

export async function enterOfficeUser(user: OfficeUser, password: string): Promise<User> {
  if (!internalAuth) throw new Error('Firebase no está configurado.');
  persistenceReady ||= setPersistence(internalAuth, inMemoryPersistence);
  await persistenceReady;
  const credential = await signInWithEmailAndPassword(internalAuth, user.email, password);
  try {
    const confirmed = await officeRequest<{ user: OfficeUser }>('me', {}, credential.user);
    if (confirmed.user.id !== user.id || !confirmed.user.active) throw new Error('Usuario interno no autorizado.');
    return credential.user;
  } catch (error) { await signOut(internalAuth); throw error; }
}

export async function leaveOfficeUser(): Promise<void> {
  if (internalAuth) await signOut(internalAuth);
}

export async function changeOfficePassword(password: string, newPassword: string): Promise<void> {
  const user = internalAuth?.currentUser;
  if (!user?.email) throw new Error('No hay sesión interna.');
  if (newPassword.length < 10 || newPassword.length > 128) throw new Error('La nueva contraseña debe tener entre 10 y 128 caracteres.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await updatePassword(user, newPassword);
}
