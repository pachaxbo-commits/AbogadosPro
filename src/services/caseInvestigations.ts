import type { Caso } from '../types';
import type { OfficeUser } from './internalAuth';
import type { LegalAssistantMessage } from './legalAssistantChats';
import type { LegalSearchResult } from './legalSearch';

export const investigationTypes = ['Jurisprudencia', 'Normativa', 'Documento', 'Resolución', 'Chat', 'Otro'] as const;
export type InvestigationType = typeof investigationTypes[number];

export interface CaseInvestigation {
  id: string;
  caseId: string;
  chatId: string;
  title: string;
  type: InvestigationType;
  date: string;
  authorUserId: string;
  summary: string;
  sources: { title: string; url?: string }[];
  results?: LegalSearchResult[];
  notes: string;
  messages: LegalAssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

export const investigationsChanged = 'abogadospro:investigations-changed';
const storageKey = (workspaceId: string) => `abogadospro_demo_investigations_v1:${workspaceId}`;

function read(workspaceId: string): CaseInvestigation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(storageKey(workspaceId)) || '[]');
    return Array.isArray(data) ? data as CaseInvestigation[] : [];
  } catch { return []; }
}

function write(workspaceId: string, items: CaseInvestigation[]) {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(items));
  window.dispatchEvent(new Event(investigationsChanged));
}

export function investigationAccess(caso: Caso, user: OfficeUser | null) {
  if (!user || !user.active || user.role !== 'abogado') return 'none' as const;
  if (caso.ownerUserId === user.id) return 'owner' as const;
  if (caso.sharedWithUserIds?.includes(user.id)) return caso.sharePermissions?.[user.id] === 'collaborate' ? 'collaborate' as const : 'read' as const;
  return 'none' as const;
}

export function listCaseInvestigations(workspaceId: string, caso: Caso, user: OfficeUser | null, isDemo: boolean) {
  if (!isDemo || investigationAccess(caso, user) === 'none') return [];
  return read(workspaceId).filter(item => item.caseId === caso.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveCaseInvestigation(workspaceId: string, caso: Caso, user: OfficeUser, isDemo: boolean, data: {
  title: string; type: InvestigationType; notes?: string; chatId: string; messages: LegalAssistantMessage[];
}) {
  if (!isDemo) throw new Error('Las investigaciones estarán disponibles al conectar el almacenamiento seguro del estudio.');
  if (!['owner', 'collaborate'].includes(investigationAccess(caso, user))) throw new Error('No tienes permiso para guardar investigaciones en este caso.');
  const title = data.title.trim();
  if (!title || !investigationTypes.includes(data.type) || !data.messages.length) throw new Error('Completa el título, tipo y conversación de la investigación.');
  const now = new Date().toISOString();
  const results = data.messages.flatMap(message => message.search?.results || []);
  const sources = [...new Map(results.map(result => [result.url, { title: `${result.title} · ${result.source}`, url: result.url }])).values()];
  const item: CaseInvestigation = {
    id: crypto.randomUUID(), caseId: caso.id, chatId: data.chatId, title, type: data.type,
    date: now.slice(0, 10), authorUserId: user.id,
    summary: data.messages.find(message => message.role === 'user')?.text.trim().slice(0, 240) || title,
    sources, results, notes: data.notes?.trim() || '',
    messages: data.messages.map(message => ({ ...message, search: message.search ? {
      ...message.search, results: message.search.results.map(result => ({ ...result })),
    } : undefined })), createdAt: now, updatedAt: now,
  };
  write(workspaceId, [item, ...read(workspaceId)]);
  return item;
}

export function updateCaseInvestigation(workspaceId: string, caso: Caso, user: OfficeUser, isDemo: boolean, id: string, changes: {
  title: string; type: InvestigationType; notes: string;
}) {
  if (!isDemo) throw new Error('Esta edición requiere el almacenamiento seguro del estudio.');
  const access = investigationAccess(caso, user);
  const items = read(workspaceId);
  const item = items.find(value => value.id === id && value.caseId === caso.id);
  if (!item || (access !== 'owner' && !(access === 'collaborate' && item.authorUserId === user.id))) throw new Error('No tienes permiso para editar esta investigación.');
  if (!changes.title.trim() || !investigationTypes.includes(changes.type)) throw new Error('Completa el título y el tipo.');
  const updated = { ...item, title: changes.title.trim(), type: changes.type, notes: changes.notes.trim(), updatedAt: new Date().toISOString() };
  write(workspaceId, items.map(value => value.id === id ? updated : value));
  return updated;
}

export function deleteCaseInvestigation(workspaceId: string, caso: Caso, user: OfficeUser, isDemo: boolean, id: string) {
  if (!isDemo) throw new Error('Esta eliminación requiere el almacenamiento seguro del estudio.');
  const access = investigationAccess(caso, user);
  const items = read(workspaceId);
  const item = items.find(value => value.id === id && value.caseId === caso.id);
  if (!item || (access !== 'owner' && !(access === 'collaborate' && item.authorUserId === user.id))) throw new Error('No tienes permiso para eliminar esta investigación.');
  write(workspaceId, items.filter(value => value.id !== id));
}

export function clearDemoInvestigations(workspaceId: string) {
  localStorage.removeItem(storageKey(workspaceId));
  window.dispatchEvent(new Event(investigationsChanged));
}

export function removeCaseInvestigations(workspaceId: string, caseId: string) {
  write(workspaceId, read(workspaceId).filter(item => item.caseId !== caseId));
}
