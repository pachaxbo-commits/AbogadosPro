export type LegalAssistantAction = 'jurisprudencia' | 'normativa' | 'resolucion' | 'documentos' | 'investigacion';
export type LegalAssistantPermission = 'owner' | 'assigned' | 'read' | 'collaborate';
import type { LegalSearchFilters, LegalSearchKind, LegalSearchResult } from './legalSearch';

export interface LegalAssistantContext {
  workspaceId: string;
  internalUserId: string;
  role: 'abogado' | 'asistente';
  caseId?: string;
  sharePermission?: LegalAssistantPermission;
}

export interface LegalAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  search?: { kind: LegalSearchKind; query: string; filters?: LegalSearchFilters; results: LegalSearchResult[] };
}

export interface LegalAssistantChat {
  id: string;
  title: string;
  caseId?: string;
  createdAt: string;
  updatedAt: string;
  messages: LegalAssistantMessage[];
}

export interface LegalAssistantChatStore {
  list(): LegalAssistantChat[];
  save(chat: LegalAssistantChat): void;
  remove(id: string): void;
}

const memory = new Map<string, LegalAssistantChat[]>();
const storageKey = (context: LegalAssistantContext) => `abogadospro_legal_assistant_v1:${context.workspaceId}:${context.internalUserId}`;

export function createLegalAssistantChatStore(context: LegalAssistantContext, demo: boolean): LegalAssistantChatStore {
  const key = storageKey(context);
  const list = (): LegalAssistantChat[] => {
    try {
      const stored = demo ? JSON.parse(localStorage.getItem(key) || '[]') : memory.get(key) || [];
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  };
  const write = (chats: LegalAssistantChat[]) => {
    if (demo) localStorage.setItem(key, JSON.stringify(chats));
    else memory.set(key, chats);
  };
  return {
    list,
    save(chat) { write([chat, ...list().filter(item => item.id !== chat.id)]); },
    remove(id) { write(list().filter(item => item.id !== id)); },
  };
}

export function unavailableAssistantReply(demo: boolean, action?: LegalAssistantAction): string {
  const feature = action === 'jurisprudencia' ? 'la búsqueda de jurisprudencia'
    : action === 'normativa' ? 'la búsqueda de normativa'
      : action === 'resolucion' ? 'el análisis de resoluciones'
        : action === 'documentos' ? 'la consulta de documentos del caso'
          : action === 'investigacion' ? 'el guardado de investigaciones' : 'el asistente jurídico';
  return `${demo ? 'Demo: ' : ''}Esta función estará disponible al conectar ${feature}. No se ha consultado ninguna fuente jurídica.`;
}
