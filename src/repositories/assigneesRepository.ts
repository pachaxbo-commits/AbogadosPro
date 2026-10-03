import type { Assignee, AssigneeInput } from '../types/assignee';

export interface AssigneesRepository {
  list(workspaceId: string): Assignee[];
  add(workspaceId: string, data: AssigneeInput): Assignee[];
  update(workspaceId: string, id: string, data: AssigneeInput): Assignee[];
}

const storageKey = (workspaceId: string) => `abogadospro_assignees_v1:${encodeURIComponent(workspaceId)}`;
const demoAssignees: Assignee[] = [
  { id: 'demo-assignee-carlos', nombre: 'Carlos Mendoza', telefono: '', correo: '', estado: 'Activo', fechaCreacion: '2026-01-01T00:00:00.000Z' },
  { id: 'demo-assignee-maria', nombre: 'María López', telefono: '', correo: '', estado: 'Activo', fechaCreacion: '2026-01-01T00:00:00.000Z' },
];

function read(workspaceId: string): Assignee[] {
  const raw = localStorage.getItem(storageKey(workspaceId));
  if (raw === null) return workspaceId === 'demo' ? demoAssignees.map((item) => ({ ...item })) : [];
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error('No se pudieron leer los encargados guardados. Los datos locales se conservaron.'); }
  if (!Array.isArray(value) || !value.every((item) =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' && typeof item.nombre === 'string' &&
    typeof item.telefono === 'string' && typeof item.correo === 'string' &&
    (item.estado === 'Activo' || item.estado === 'Inactivo') &&
    typeof item.fechaCreacion === 'string'
  )) throw new Error('Los encargados guardados tienen un formato inválido. Los datos locales se conservaron.');
  return value as Assignee[];
}

function normalized(data: AssigneeInput): AssigneeInput {
  const nombre = data.nombre.trim().replace(/\s+/g, ' ');
  const telefono = data.telefono.trim();
  const correo = data.correo.trim();
  if (!nombre) throw new Error('El nombre completo es obligatorio.');
  if (nombre.length > 120) throw new Error('El nombre no puede superar 120 caracteres.');
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Introduce un correo electrónico válido.');
  if (data.estado !== 'Activo' && data.estado !== 'Inactivo') throw new Error('El estado del encargado no es válido.');
  return { nombre, telefono, correo, estado: data.estado };
}

function write(workspaceId: string, value: Assignee[]): Assignee[] {
  try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(value)); }
  catch { throw new Error('No se pudo guardar el encargado en este navegador.'); }
  return value;
}

export const assigneesRepository: AssigneesRepository = {
  list: read,
  add(workspaceId, data) {
    const next = [...read(workspaceId), { ...normalized(data), id: crypto.randomUUID(), fechaCreacion: new Date().toISOString() }];
    return write(workspaceId, next);
  },
  update(workspaceId, id, data) {
    const current = read(workspaceId);
    if (!current.some((item) => item.id === id)) throw new Error('El encargado ya no existe.');
    const changes = normalized(data);
    return write(workspaceId, current.map((item) => item.id === id ? { ...item, ...changes } : item));
  },
};
