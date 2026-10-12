export type SharedKind = 'case' | 'task' | 'event';

export interface SharedNotice {
  id: string;
  kind: SharedKind;
  itemId: string;
  recipientId: string;
  actorId: string;
  title: string;
  createdAt: string;
  readAt?: string;
}

const key = 'abogadospro_demo_shared_notices_v1';
export const sharedNoticesChanged = 'abogadospro-demo-shared-notices-changed';

function readAll(): SharedNotice[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeAll(items: SharedNotice[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(sharedNoticesChanged));
}

export function listSharedNotices(recipientId: string): SharedNotice[] {
  return readAll().filter(item => item.recipientId === recipientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function syncSharedNotices(kind: SharedKind, itemId: string, title: string, actorId: string, before: string[] = [], after: string[] = []) {
  const previous = new Set(before);
  const next = new Set(after);
  let items = readAll().filter(item => !(item.kind === kind && item.itemId === itemId && !item.readAt && !next.has(item.recipientId)));
  for (const recipientId of next) {
    if (previous.has(recipientId)) continue;
    items = items.filter(item => !(item.kind === kind && item.itemId === itemId && item.recipientId === recipientId));
    items.push({ id: crypto.randomUUID(), kind, itemId, recipientId, actorId, title, createdAt: new Date().toISOString() });
  }
  writeAll(items);
}

export function markSharedNoticeRead(kind: SharedKind, itemId: string, recipientId: string) {
  const items = readAll();
  if (!items.some(item => item.kind === kind && item.itemId === itemId && item.recipientId === recipientId && !item.readAt)) return;
  writeAll(items.map(item => item.kind === kind && item.itemId === itemId && item.recipientId === recipientId && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item));
}

export function clearSharedNotices() { localStorage.removeItem(key); window.dispatchEvent(new Event(sharedNoticesChanged)); }
