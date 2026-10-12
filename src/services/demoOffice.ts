import type { OfficeRole, OfficeUser } from './internalAuth';

export const DEMO_OFFICE_PASSWORD = 'Demo2026!Prueba';

const initialUsers: OfficeUser[] = [
  { id: 'demo-jefe', displayName: 'Admin del estudio', role: 'abogado', isOfficeAdmin: true, active: true, email: '', sessionVersion: 1, canRegisterExpenses: true },
  { id: 'demo-abogado-2', displayName: 'Abogado 2', role: 'abogado', isOfficeAdmin: false, active: true, email: '', sessionVersion: 1, canRegisterExpenses: true },
  ...[1, 2, 3].map(number => ({
    id: `demo-asistente-${number}`, displayName: `Asistente ${number}`, role: 'asistente' as OfficeRole,
    isOfficeAdmin: false, active: true, email: '', sessionVersion: 1, canRegisterExpenses: true,
  })),
];
type Credential = { salt: string; hash: string };
let users = initialUsers.map(item => ({ ...item }));
const credentials = new Map<string, Credential>();
const encoder = new TextEncoder();
async function digest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
}
async function savePassword(id: string, password: string) {
  if (password.length < 10 || password.length > 128) throw new Error('La contraseña debe tener entre 10 y 128 caracteres.');
  const salt = crypto.randomUUID();
  credentials.set(id, { salt, hash: await digest(password, salt) });
}
export function listDemoUsers(): OfficeUser[] { return users.map(item => ({ ...item })); }
export async function verifyDemoUser(id: string, password: string): Promise<OfficeUser> {
  const user = users.find(item => item.id === id && item.active);
  if (!user) throw new Error('Perfil inactivo o inexistente.');
  const stored = credentials.get(id);
  const expected = stored ? stored.hash : await digest(DEMO_OFFICE_PASSWORD, id);
  const actual = await digest(password, stored ? stored.salt : id);
  if (actual !== expected) throw new Error('Contraseña de prueba incorrecta.');
  return { ...user };
}
export async function createDemoUser(displayName: string, role: OfficeRole, password: string) {
  if (displayName.trim().length < 2 || displayName.trim().length > 100) throw new Error('Nombre inválido.');
  if (!['abogado', 'asistente'].includes(role)) throw new Error('Rol inválido.');
  const user: OfficeUser = { id: `demo-${crypto.randomUUID()}`, displayName: displayName.trim(), role,
    isOfficeAdmin: false, active: true, email: '', sessionVersion: 1, canRegisterExpenses: true };
  await savePassword(user.id, password);
  users = [...users, user];
  return { ...user };
}
export function updateDemoUser(id: string, changes: Partial<Pick<OfficeUser, 'role' | 'active'>>) {
  const user = users.find(item => item.id === id);
  if (!user) throw new Error('Usuario no encontrado.');

  if (changes.role !== undefined && !['abogado', 'asistente'].includes(changes.role)) throw new Error('Rol inválido.');
  users = users.map(item => item.id === id ? { ...item, ...changes,
    sessionVersion: item.sessionVersion + 1 } : item);
}
export function updateOwnDemoProfile(id: string, displayName: string, photoUrl?: string) {
  if (displayName.trim().length < 2 || displayName.trim().length > 100) throw new Error('Nombre inválido.');
  if (!users.some(item => item.id === id)) throw new Error('Usuario no encontrado.');
  users = users.map(item => item.id === id ? { ...item, displayName: displayName.trim(), photoUrl: photoUrl === undefined ? item.photoUrl : photoUrl } : item);
  return { ...users.find(item => item.id === id)! };
}
export async function resetDemoPassword(id: string, password: string) {
  if (!users.some(item => item.id === id)) throw new Error('Usuario no encontrado.');
  await savePassword(id, password);
  users = users.map(item => item.id === id ? { ...item, sessionVersion: item.sessionVersion + 1 } : item);
}
export async function changeDemoPassword(id: string, oldPassword: string, newPassword: string) {
  await verifyDemoUser(id, oldPassword);
  await resetDemoPassword(id, newPassword);
}
export function resetDemoUsers() {
  users = initialUsers.map(item => ({ ...item }));
  credentials.clear();
}
