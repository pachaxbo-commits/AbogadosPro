import type { Actividad, Caso, Cliente, Evento, Gasto, Pago, Reembolso, Tarea } from '../types';
import type { OfficeUser } from '../services/internalAuth';
import { INITIAL_CASES } from '../data/initialMockData';
import { listDemoUsers } from '../services/demoOffice';
import { expenseReimbursementStatus } from '../services/expenseReimbursement';
import { syncSharedNotices } from '../services/demoShareNotifications';
import { demoLegalRepository } from './demoRepo';
import { LocalStorageLegalRepository } from './localStorageRepo';
import type { ILegalRepository } from './types';

const initialCaseIds = INITIAL_CASES.map(item => item.id);
const ownerOf = (caso: Caso) => caso.ownerUserId || (initialCaseIds.indexOf(caso.id) % 2 === 1 ? 'demo-abogado-2' : 'demo-jefe');
const assignedTo = (caso: Caso) => caso.assignedUserIds !== undefined
  ? caso.assignedUserIds
  : initialCaseIds.includes(caso.id) ? [`demo-asistente-${initialCaseIds.indexOf(caso.id) % 3 + 1}`] : [];
const workAssignedTo = (item: Tarea | Evento) => item.assignedUserIds || [];
const activeIds = (ids: string[] | undefined, role: OfficeUser['role'], existing: string[] = []) => {
  const allowed = new Set(listDemoUsers().filter(person => person.active && person.role === role).map(person => person.id));
  const unique = [...new Set(ids || [])];
  const historic = new Set(listDemoUsers().filter(person => person.role === role && existing.includes(person.id)).map(person => person.id));
  if (unique.some(id => !allowed.has(id) && !historic.has(id))) throw new Error('Selecciona usuarios internos activos del rol correspondiente.');
  return unique;
};
const visibleCase = (caso: Caso, user: OfficeUser) => listDemoUsers().some(person => person.id === user.id && person.active) && (user.role === 'abogado'
  ? ownerOf(caso) === user.id || Boolean(caso.sharedWithUserIds?.includes(user.id)) : assignedTo(caso).includes(user.id));
const visibleWork = (item: Tarea | Evento, user: OfficeUser, caso?: Caso) =>
  listDemoUsers().some(person => person.id === user.id && person.active) && (user.role === 'abogado' ? (item.ownerUserId || (caso ? ownerOf(caso) : 'demo-jefe')) === user.id || Boolean(caso && (ownerOf(caso) === user.id || caso.sharedWithUserIds?.includes(user.id))) || Boolean(item.sharedWithUserIds?.includes(user.id))
    : workAssignedTo(item).includes(user.id));
const publicCase = (caso: Caso, user: OfficeUser): Caso => user.role === 'asistente'
  ? { ...caso, ownerUserId: ownerOf(caso), assignedUserIds: assignedTo(caso), honorariosAcordados: 0 } : { ...caso, ownerUserId: ownerOf(caso), assignedUserIds: assignedTo(caso) };

export function createDemoScopedRepository(user: OfficeUser): ILegalRepository {
  const base = demoLegalRepository as LocalStorageLegalRepository;
  const cases = async () => base.getCases();
  const caseById = async (id: string) => (await cases()).find(item => item.id === id);
  const requireCase = async (id: string) => {
    const item = await caseById(id);
    if (!item || !visibleCase(item, user)) throw new Error('No tienes acceso a este caso en el demo.');
    return item;
  };
  const requireCaseWrite = (item: Caso) => { if (user.role === 'asistente' && assignedTo(item).includes(user.id)) return; if (user.role === 'abogado' && (ownerOf(item) === user.id || item.sharePermissions?.[user.id] === 'collaborate')) return; throw new Error('El caso está disponible solo para lectura.'); };
  const requireOwner = (item: Caso) => { if (user.role !== 'abogado' || ownerOf(item) !== user.id) throw new Error('Solo el abogado propietario puede modificar el acceso.'); };
  const requireLawyer = () => {
    if (user.role === 'asistente') throw new Error('Esta acción no está disponible para asistentes en el demo.');
  };
  const caseIds = async () => new Set((await cases()).filter(item => visibleCase(item, user)).map(item => item.id));
  const filterFinance = async <T extends Pago | Gasto | Reembolso>(items: T[]) => {
    if (user.role === 'asistente') return [] as T[];
    const ids = await caseIds();
    return items.filter(item => ids.has(item.casoId));
  };
  const getWork = async <T extends Tarea | Evento>(items: T[], casoId?: string) => {
    const byId = new Map((await cases()).map(item => [item.id, item]));
    return items.filter(item => (!casoId || item.casoId === casoId) && visibleWork(item, user, byId.get(item.casoId)))
      .map(item => ({ ...item, ownerUserId: item.ownerUserId || (byId.get(item.casoId) ? ownerOf(byId.get(item.casoId)!) : undefined) }));
  };
  const requireTask = async (id: string) => {
    const task = (await base.getTasks()).find(item => item.id === id);
    if (!task || !(await getWork([task])).length) throw new Error('No tienes acceso a esta tarea en el demo.');
    return task;
  };
  const requireEvent = async (id: string) => {
    const event = (await base.getEvents()).find(item => item.id === id);
    if (!event || !(await getWork([event])).length) throw new Error('No tienes acceso a este evento en el demo.');
    return event;
  };
  const requireFinance = async (id: string, kind: 'payments' | 'expenses' | 'reimbursements') => {
    requireLawyer();
    const items = kind === 'payments' ? await base.getPayments() : kind === 'expenses'
      ? await base.getExpenses() : await base.getReimbursements();
    const item = items.find(value => value.id === id);
    if (!item) throw new Error('Registro no encontrado.');
    const caso = await requireCase(item.casoId); if (kind === 'expenses') requireCaseWrite(caso); else requireOwner(caso);
  };
  return new Proxy(base, {
    get(target, property, receiver) {
      switch (property) {
        case 'getCases': return async () => (await cases()).filter(item => visibleCase(item, user)).map(item => publicCase(item, user));
        case 'getCaseById': return async (id: string) => {
          const item = await caseById(id);
          return item && visibleCase(item, user) ? publicCase(item, user) : null;
        };
        case 'getCasesByClientId': return async (id: string) => (await cases()).filter(item => item.clienteId === id && visibleCase(item, user)).map(item => publicCase(item, user));
        case 'getClients': return async () => {
          const all = await base.getClients();
          const ids = await caseIds();
          const clientIds = new Set((await cases()).filter(item => ids.has(item.id)).map(item => item.clienteId));
          return all.filter(item => item.ownerUserId === user.id || clientIds.has(item.id));
        };
        case 'getClientById': return async (id: string) => (await (receiver as ILegalRepository).getClients()).find(item => item.id === id) || null;
        case 'getActivities': return async (casoId?: string) => {
          if (user.role === 'asistente') return [] as Actividad[];
          const ids = await caseIds();
          return (await base.getActivities(casoId)).filter(item => ids.has(item.casoId));
        };
        case 'getEvents': return async (casoId?: string) => getWork(await base.getEvents(casoId), casoId);
        case 'getTasks': return async (casoId?: string) => getWork(await base.getTasks(casoId), casoId);
        case 'getPayments': return async (casoId?: string) => filterFinance(await base.getPayments(casoId));
        case 'getExpenses': return async (casoId?: string) => { const ids = await caseIds(); const all = (await base.getExpenses(casoId)).filter(item => ids.has(item.casoId)); if (user.role !== 'asistente') return all; const refunds = await base.getReimbursements(casoId); return all.map(item => ({ ...item, reimbursementStatus: expenseReimbursementStatus(item, refunds) })); };
        case 'getReimbursements': return async (casoId?: string) => filterFinance(await base.getReimbursements(casoId));
        case 'addClient': return async (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => {
          requireLawyer(); return base.addClient({ ...data, ownerUserId: user.id });
        };
        case 'updateClient': return async (id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>) => {
          requireLawyer();
          if (!(await (receiver as ILegalRepository).getClientById(id))) throw new Error('Cliente no visible.');
          return base.updateClient(id, data);
        };
        case 'addCase': return async (data: Omit<Caso, 'id' | 'fechaCreacion'>) => {
          requireLawyer(); return base.addCase({ ...data, ownerUserId: user.id, assignedUserIds: activeIds(data.assignedUserIds, 'asistente'), sharedWithUserIds: [] });
        };
        case 'updateCase': return async (id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>) => {
          requireLawyer(); const item = await requireCase(id); requireCaseWrite(item);
          if (ownerOf(item) !== user.id) return base.updateCase(id, { ...data, ownerUserId: ownerOf(item), assignedUserIds: assignedTo(item), sharedWithUserIds: item.sharedWithUserIds || [], sharePermissions: item.sharePermissions || {}, honorariosAcordados: item.honorariosAcordados });
          const sharedWithUserIds = activeIds(data.sharedWithUserIds ?? item.sharedWithUserIds, 'abogado', item.sharedWithUserIds).filter(personId => personId !== user.id);
          const sharePermissions = Object.fromEntries(sharedWithUserIds.map(personId => [personId, (data.sharePermissions ?? item.sharePermissions)?.[personId] === 'collaborate' ? 'collaborate' : 'read'])) as Caso['sharePermissions'];
          const updated = await base.updateCase(id, { ...data, ownerUserId: ownerOf(item), assignedUserIds: activeIds(data.assignedUserIds, 'asistente', assignedTo(item)), sharedWithUserIds, sharePermissions });
          syncSharedNotices('case', id, updated.nombre, user.id, item.sharedWithUserIds, sharedWithUserIds);
          return updated;
        };
        case 'addActivity': return async (data: Omit<Actividad, 'id'>) => {
          requireLawyer(); const item = await requireCase(data.casoId); requireCaseWrite(item);
          return base.addActivity({ ...data, ownerUserId: ownerOf(item) });
        };
        case 'addTask': return async (data: Parameters<ILegalRepository['addTask']>[0]) => {
          const item = await requireCase(data.casoId); requireCaseWrite(item);
          if (user.role === 'asistente' && data.assignedUserIds?.some(id => id !== user.id)) throw new Error('No puedes asignar a otro usuario.');
          const created = await base.addTask({ ...data, assignedUserIds: user.role === 'asistente' ? [user.id] : activeIds(data.assignedUserIds, 'asistente'), sharedWithUserIds: user.role === 'asistente' ? [] : activeIds(data.sharedWithUserIds, 'abogado').filter(id => id !== user.id), ownerUserId: user.role === 'abogado' ? user.id : ownerOf(item) } as Parameters<ILegalRepository['addTask']>[0]);
          syncSharedNotices('task', created.id, created.titulo, user.id, [], created.sharedWithUserIds);
          return created;
        };
        case 'updateTask': return async (id: string, data: Parameters<ILegalRepository['updateTask']>[1]) => {
          const previous = await requireTask(id);
          if (user.role !== 'abogado' || previous.ownerUserId !== user.id && ownerOf((await caseById(previous.casoId))!) !== user.id) throw new Error('Solo el propietario puede modificar asignaciones de la tarea.');
          await requireCase(data.casoId);
          const updated = await base.updateTask(id, { ...data, assignedUserIds: activeIds(data.assignedUserIds, 'asistente', previous.assignedUserIds), sharedWithUserIds: activeIds(data.sharedWithUserIds, 'abogado', previous.sharedWithUserIds).filter(id => id !== user.id) });
          syncSharedNotices('task', id, updated.titulo, user.id, previous.sharedWithUserIds, updated.sharedWithUserIds);
          return updated;
        };
        case 'setTaskStatus': return async (id: string, ...args: Parameters<ILegalRepository['setTaskStatus']> extends [string, ...infer Rest] ? Rest : never) => {
          const task = await requireTask(id); const caso = await caseById(task.casoId);
          if (caso && visibleCase(caso, user)) requireCaseWrite(caso);
          return base.setTaskStatus(id, ...args);
        };
        case 'deleteTask': return async (id: string) => { requireLawyer(); const task = await requireTask(id); if (task.ownerUserId !== user.id && ownerOf((await caseById(task.casoId))!) !== user.id) throw new Error('Solo el propietario puede eliminar la tarea.'); await base.deleteTask(id); syncSharedNotices('task', id, task.titulo, user.id, task.sharedWithUserIds, []); };
        case 'addEvent': return async (data: Omit<Evento, 'id'>) => {
          const item = await requireCase(data.casoId); requireCaseWrite(item);
          if (user.role === 'asistente' && data.assignedUserIds?.some(id => id !== user.id)) throw new Error('No puedes asignar a otro usuario.');
          const created = await base.addEvent({ ...data, ownerUserId: user.role === 'abogado' ? user.id : ownerOf(item), assignedUserIds: user.role === 'asistente' ? [user.id] : activeIds(data.assignedUserIds, 'asistente'), sharedWithUserIds: user.role === 'asistente' ? [] : activeIds(data.sharedWithUserIds, 'abogado').filter(id => id !== user.id) });
          syncSharedNotices('event', created.id, created.titulo, user.id, [], created.sharedWithUserIds);
          return created;
        };
        case 'updateEvent': return async (id: string, data: Omit<Evento, 'id'>) => {
          const previous = await requireEvent(id);
          if (user.role !== 'abogado' || (previous.ownerUserId || ownerOf((await caseById(previous.casoId))!)) !== user.id) throw new Error('Solo el propietario puede modificar asignaciones del evento.');
          await requireCase(data.casoId);
          const updated = await base.updateEvent(id, { ...data, assignedUserIds: activeIds(data.assignedUserIds, 'asistente'), sharedWithUserIds: activeIds(data.sharedWithUserIds, 'abogado').filter(id => id !== user.id) });
          syncSharedNotices('event', id, updated.titulo, user.id, previous.sharedWithUserIds, updated.sharedWithUserIds);
          return updated;
        };
        case 'saveEventResult': return async (casoId: string, id: string, data: Parameters<ILegalRepository['saveEventResult']>[2]) => {
          await requireEvent(id); requireCaseWrite(await requireCase(casoId));
          return getWork(await base.saveEventResult(casoId, id, data));
        };
        case 'addPayment': return async (data: Omit<Pago, 'id'>) => { requireLawyer(); requireOwner(await requireCase(data.casoId)); return base.addPayment(data); };
        case 'addExpense': return async (data: Omit<Gasto, 'id'>) => { const caso = await requireCase(data.casoId); requireCaseWrite(caso); return base.addExpense({ ...data, ownerUserId: ownerOf(caso), registeredByUserId: user.id }); };
        case 'addReimbursement': return async (data: Omit<Reembolso, 'id'>) => { requireLawyer(); requireOwner(await requireCase(data.casoId)); return base.addReimbursement(data); };
        case 'updatePayment': return async (id: string, data: Omit<Pago, 'id'>) => { await requireFinance(id, 'payments'); return base.updatePayment(id, data); };
        case 'updateExpense': return async (id: string, data: Omit<Gasto, 'id'>) => { await requireFinance(id, 'expenses'); return base.updateExpense(id, data); };
        case 'updateReimbursement': return async (id: string, data: Omit<Reembolso, 'id'>) => { await requireFinance(id, 'reimbursements'); return base.updateReimbursement(id, data); };
        case 'deletePayment': return async (id: string) => { await requireFinance(id, 'payments'); return base.deletePayment(id); };
        case 'deleteExpense': return async (id: string) => { await requireFinance(id, 'expenses'); return base.deleteExpense(id); };
        case 'deleteReimbursement': return async (id: string) => { await requireFinance(id, 'reimbursements'); return base.deleteReimbursement(id); };
        case 'deleteCaseCascade': return async (id: string, docs: Parameters<typeof base.deleteCaseCascade>[1]) => { requireLawyer(); requireOwner(await requireCase(id)); return base.deleteCaseCascade(id, docs); };
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ILegalRepository;
}
