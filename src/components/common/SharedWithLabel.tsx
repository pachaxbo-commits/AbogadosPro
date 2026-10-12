import { useOffice } from '../../context/OfficeContext';
import { listSharedNotices, type SharedKind } from '../../services/demoShareNotifications';

export function SharedWithLabel({ kind, itemId, ownerUserId, sharedWithUserIds, sharePermissions }: {
  kind: SharedKind;
  itemId: string;
  ownerUserId?: string;
  sharedWithUserIds?: string[];
  sharePermissions?: Record<string, 'read' | 'collaborate'>;
}) {
  const { users, user } = useOffice();
  if (!user || !sharedWithUserIds?.length) return null;
  const name = (id: string) => users.find(item => item.id === id)?.displayName;
  if (ownerUserId === user.id) return <p className="text-xs font-medium text-brand-900">Compartido con: {sharedWithUserIds.map(id => `${name(id) || 'Abogado'} · ${sharePermissions?.[id] === 'collaborate' ? 'Colaborar' : 'Solo lectura'}`).join('; ')}</p>;
  if (sharedWithUserIds.includes(user.id)) {
    const notice = listSharedNotices(user.id).find(item => item.kind === kind && item.itemId === itemId);
    const actorName = name(ownerUserId || '') || name(notice?.actorId || '') || name(ownerUserId === 'demo-lawyer' ? 'demo-jefe' : '') || 'Abogado propietario';
    const heading = kind === 'case' ? 'Caso compartido' : kind === 'task' ? 'Tarea compartida' : 'Evento compartido';
    return <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-brand-900" aria-label="Acceso compartido"><p className="font-bold">{heading}</p><p>Compartido por: <span className="font-semibold">{actorName}</span></p><p>Permiso: <span className="font-semibold">{sharePermissions?.[user.id] === 'collaborate' ? 'Colaborar' : 'Solo lectura'}</span></p></div>;
  }
  return null;
}
