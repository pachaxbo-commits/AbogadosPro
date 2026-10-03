import { ILegalRepository } from './types';
import { Cliente, Caso, Actividad, Evento, Pago, Gasto, Reembolso, Tarea, DatosTarea, EstadoTarea, DocumentoCaso } from '../types';
import { recoverDemoTransaction, writeDemoTransaction } from './demoStorageTransaction';
import { DOCUMENT_STORAGE_KEY } from './documentsRepository';
import { getInitialTasks } from '../data/taskDemoData';
import { readStoredTask, validateTask } from '../services/tasks';
import { applyEventResult } from '../services/eventResults';
import type { DatosResultadoEvento } from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_CASES,
  INITIAL_EVENTS,
  INITIAL_ACTIVITIES,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  getInitialMockData,
} from '../data/initialMockData';

const STORAGE_KEYS = {
  CLIENTS: 'abogadospro_clients_v1',
  CASES: 'abogadospro_cases_v1',
  ACTIVITIES: 'abogadospro_activities_v1',
  EVENTS: 'abogadospro_events_v1',
  PAYMENTS: 'abogadospro_payments_v1',
  EXPENSES: 'abogadospro_expenses_v1',
  REIMBURSEMENTS: 'abogadospro_reimbursements_v1',
  TASKS: 'abogadospro_tasks_v1',
};

/**
 * Recuperación segura desde LocalStorage.
 * Si el contenido está corrupto, malformado o no es un array válido,
 * recupera de forma segura los datos demo iniciales sin romper la aplicación.
 */
function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);

    // Si se esperaba una lista de datos pero se obtuvo un objeto no-array o nulo, usar fallback
    if (Array.isArray(fallback)) {
      if (!Array.isArray(parsed)) {
        return fallback;
      }
    }

    return parsed as T;
  } catch (e) {
    console.warn(`Error al leer ${key} desde localStorage. Recuperando datos demo iniciales de forma segura:`, e);
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error al guardar ${key} en localStorage:`, e);
  }
}

export class LocalStorageLegalRepository implements ILegalRepository {
  private clients: Cliente[];
  private cases: Caso[];
  private activities: Actividad[];
  private events: Evento[];
  private payments: Pago[];
  private expenses: Gasto[];
  private reimbursements: Reembolso[];
  private tasks: Tarea[] = [];
  private tasksReadError: Error | null = null;

  constructor() {
    recoverDemoTransaction();
    this.clients = getStorage<Cliente[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    this.cases = getStorage<Caso[]>(STORAGE_KEYS.CASES, INITIAL_CASES);
    this.activities = getStorage<Actividad[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    this.events = getStorage<Evento[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    this.payments = getStorage<Pago[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    this.expenses = getStorage<Gasto[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    this.reimbursements = getStorage<Reembolso[]>(STORAGE_KEYS.REIMBURSEMENTS, []);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (stored === null) this.saveTasks(getInitialTasks(this.cases.map((caso) => caso.id)));
      else {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) throw new Error('Formato inválido');
        this.tasks = parsed.map(readStoredTask);
      }
    } catch {
      this.tasksReadError = new Error('No se pudieron cargar las tareas locales. Los datos guardados se conservaron.');
    }
  }

  // El adaptador es el único responsable de la persistencia y las fechas de auditoría.
  private saveTasks(tasks: Tarea[]): void {
    try { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }
    catch { throw new Error('No se pudo guardar la tarea. Revisa el espacio y los permisos del navegador.'); }
    this.tasks = tasks;
  }

  private ensureTasksLoaded(): void {
    if (this.tasksReadError) throw this.tasksReadError;
  }

  async getTasks(casoId?: string): Promise<Tarea[]> {
    this.ensureTasksLoaded();
    return this.tasks.filter((task) => !casoId || task.casoId === casoId).map((task) => ({ ...task }));
  }

  async addTask(data: DatosTarea): Promise<Tarea> {
    this.ensureTasksLoaded();
    const clean = validateTask(data, this.cases.map((caso) => caso.id));
    const stamp = new Date().toISOString();
    const task: Tarea = { ...clean, id: `task-${crypto.randomUUID()}`, estado: 'Pendiente', createdAt: stamp, updatedAt: stamp };
    this.saveTasks([task, ...this.tasks]);
    return { ...task };
  }

  async updateTask(id: string, data: DatosTarea): Promise<Tarea> {
    this.ensureTasksLoaded();
    const existing = this.tasks.find((task) => task.id === id);
    if (!existing) throw new Error('La tarea ya no existe.');
    const updated = { ...existing, ...validateTask(data, this.cases.map((caso) => caso.id)), updatedAt: new Date().toISOString() };
    this.saveTasks(this.tasks.map((task) => task.id === id ? updated : task));
    return { ...updated };
  }

  async setTaskStatus(id: string, estado: EstadoTarea, resultadoFinalizacion?: string): Promise<Tarea> {
    this.ensureTasksLoaded();
    const existing = this.tasks.find((task) => task.id === id);
    if (!existing) throw new Error('La tarea ya no existe.');
    if (!['Pendiente', 'Completada'].includes(estado)) throw new Error('Estado de tarea inválido.');
    if (existing.estado === estado) return { ...existing };
    const stamp = new Date().toISOString();
    const updated = { ...existing, estado, updatedAt: stamp, completedAt: estado === 'Completada' ? stamp : undefined, resultadoFinalizacion: estado === 'Completada' ? resultadoFinalizacion?.trim() || undefined : existing.resultadoFinalizacion };
    this.saveTasks(this.tasks.map((task) => task.id === id ? updated : task));
    return { ...updated };
  }

  async deleteTask(id: string): Promise<void> {
    this.ensureTasksLoaded();
    if (!this.tasks.some((task) => task.id === id)) throw new Error('La tarea ya no existe.');
    this.saveTasks(this.tasks.filter((task) => task.id !== id));
  }

  // Clientes
  async getClients(): Promise<Cliente[]> {
    return [...this.clients];
  }

  async getClientById(id: string): Promise<Cliente | null> {
    return this.clients.find((c) => c.id === id) || null;
  }

  async addClient(clienteData: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> {
    const newClient: Cliente = {
      ...clienteData,
      id: `cli-${crypto.randomUUID()}`,
      fechaRegistro: new Date().toISOString().split('T')[0],
    };
    this.clients = [newClient, ...this.clients];
    setStorage(STORAGE_KEYS.CLIENTS, this.clients);
    return newClient;
  }

  async updateClient(id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> {
    const index = this.clients.findIndex((client) => client.id === id);
    if (index < 0) throw new Error('Cliente no encontrado');
    const updated = { ...this.clients[index], ...data };
    this.clients = this.clients.map((client) => client.id === id ? updated : client);
    setStorage(STORAGE_KEYS.CLIENTS, this.clients);
    return updated;
  }

  // Casos
  async getCases(): Promise<Caso[]> {
    return [...this.cases];
  }

  async getCaseById(id: string): Promise<Caso | null> {
    return this.cases.find((c) => c.id === id) || null;
  }

  async getCasesByClientId(clienteId: string): Promise<Caso[]> {
    return this.cases.filter((c) => c.clienteId === clienteId);
  }

  async addCase(casoData: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> {
    const newCase: Caso = {
      ...casoData,
      id: `cas-${crypto.randomUUID()}`,
      fechaCreacion: new Date().toISOString().split('T')[0],
    };
    this.cases = [newCase, ...this.cases];
    setStorage(STORAGE_KEYS.CASES, this.cases);
    return newCase;
  }

  async updateCase(id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> {
    const existing = this.cases.find((caso) => caso.id === id);
    if (!existing) throw new Error('Caso no encontrado');
    const updated = { ...existing, ...data };
    this.cases = this.cases.map((caso) => caso.id === id ? updated : caso);
    setStorage(STORAGE_KEYS.CASES, this.cases);
    return updated;
  }

  // Actividades
  async getActivities(casoId?: string): Promise<Actividad[]> {
    if (casoId) {
      return this.activities.filter((a) => a.casoId === casoId);
    }
    return [...this.activities];
  }

  async addActivity(actividadData: Omit<Actividad, 'id'>): Promise<Actividad> {
    const newActivity: Actividad = {
      ...actividadData,
      id: `act-${Date.now()}`,
    };
    this.activities = [newActivity, ...this.activities];
    setStorage(STORAGE_KEYS.ACTIVITIES, this.activities);
    return newActivity;
  }

  // Eventos
  async getEvents(casoId?: string): Promise<Evento[]> {
    if (casoId) {
      return this.events.filter((e) => e.casoId === casoId);
    }
    return [...this.events];
  }

  async addEvent(eventoData: Omit<Evento, 'id'>): Promise<Evento> {
    const newEvent: Evento = {
      ...eventoData,
      id: `ev-${Date.now()}`,
    };
    this.events = [newEvent, ...this.events];
    setStorage(STORAGE_KEYS.EVENTS, this.events);
    return newEvent;
  }

  async updateEvent(id: string, data: Omit<Evento, 'id'>): Promise<Evento> {
    const existing = this.events.find((evento) => evento.id === id);
    if (!existing) throw new Error('Evento no encontrado');
    if ((existing.resultado || existing.eventoOrigenId) && existing.casoId !== data.casoId) throw new Error('Un evento con historial de resultado no puede cambiar de caso.');
    const updated = { ...existing, ...data };
    this.events = this.events.map((evento) => evento.id === id ? updated : evento);
    setStorage(STORAGE_KEYS.EVENTS, this.events);
    return updated;
  }

  async saveEventResult(casoId: string, id: string, data: DatosResultadoEvento): Promise<Evento[]> {
    const next = applyEventResult(this.events, casoId, id, data, new Date());
    try { localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(next)); }
    catch { throw new Error('No se pudo guardar el resultado. Revisa el almacenamiento del navegador.'); }
    this.events = next;
    return next.map((event) => ({ ...event }));
  }

  // Finanzas: Pagos
  async getPayments(casoId?: string): Promise<Pago[]> {
    if (casoId) {
      return this.payments.filter((p) => p.casoId === casoId);
    }
    return [...this.payments];
  }

  async addPayment(pagoData: Omit<Pago, 'id'>): Promise<Pago> {
    this.validatePayment(pagoData);
    const newPayment: Pago = {
      ...pagoData,
      id: `pag-${Date.now()}`,
    };
    this.payments = [newPayment, ...this.payments];
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    return newPayment;
  }

  private validatePayment(data: Omit<Pago, 'id'>, excludeId?: string): void {
    const caso = this.cases.find((item) => item.id === data.casoId);
    if (!caso || !Number.isFinite(data.monto) || data.monto <= 0 || !data.fecha) throw new Error('Pago inválido');
    const paid = this.payments.filter((item) => item.casoId === data.casoId && item.id !== excludeId)
      .reduce((total, item) => total + item.monto, 0);
    if (paid + data.monto > caso.honorariosAcordados) throw new Error('Pago superior al saldo');
  }

  async updatePayment(id: string, data: Omit<Pago, 'id'>): Promise<Pago> {
    const existing = this.payments.find((item) => item.id === id);
    if (!existing || existing.casoId !== data.casoId) throw new Error('Pago no encontrado');
    this.validatePayment(data, id);
    const updated = { ...existing, ...data };
    this.payments = this.payments.map((item) => item.id === id ? updated : item);
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    return updated;
  }

  async deletePayment(id: string): Promise<void> {
    if (!this.payments.some((item) => item.id === id)) throw new Error('Pago no encontrado');
    this.payments = this.payments.filter((item) => item.id !== id);
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
  }

  // Finanzas: Gastos
  async getExpenses(casoId?: string): Promise<Gasto[]> {
    if (casoId) {
      return this.expenses.filter((g) => g.casoId === casoId);
    }
    return [...this.expenses];
  }

  async addExpense(gastoData: Omit<Gasto, 'id'>): Promise<Gasto> {
    this.validateExpense(gastoData);
    const newExpense: Gasto = {
      ...gastoData,
      id: `gst-${Date.now()}`,
    };
    this.expenses = [newExpense, ...this.expenses];
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
    return newExpense;
  }

  private reimbursableTotal(casoId: string, excludeId?: string): number {
    return this.expenses.filter((item) => item.casoId === casoId && item.id !== excludeId && item.reembolsable === true)
      .reduce((total, item) => total + item.monto, 0);
  }

  private reimbursedTotal(casoId: string, excludeId?: string): number {
    return this.reimbursements.filter((item) => item.casoId === casoId && item.id !== excludeId)
      .reduce((total, item) => total + item.monto, 0);
  }

  private validateExpense(data: Omit<Gasto, 'id'>, excludeId?: string): void {
    if (!this.cases.some((item) => item.id === data.casoId) || !data.concepto.trim() ||
      !Number.isFinite(data.monto) || data.monto <= 0 || !data.fecha) throw new Error('Gasto inválido');
    const nextReimbursable = this.reimbursableTotal(data.casoId, excludeId) + (data.reembolsable ? data.monto : 0);
    if (this.reimbursedTotal(data.casoId) > nextReimbursable) throw new Error('Gasto inferior a reembolsos recibidos');
  }

  async updateExpense(id: string, data: Omit<Gasto, 'id'>): Promise<Gasto> {
    const existing = this.expenses.find((item) => item.id === id);
    if (!existing || existing.casoId !== data.casoId) throw new Error('Gasto no encontrado');
    this.validateExpense(data, id);
    const updated = { ...existing, ...data };
    this.expenses = this.expenses.map((item) => item.id === id ? updated : item);
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
    return updated;
  }

  async deleteExpense(id: string): Promise<void> {
    const existing = this.expenses.find((item) => item.id === id);
    if (!existing) throw new Error('Gasto no encontrado');
    const nextReimbursable = this.reimbursableTotal(existing.casoId, id);
    if (this.reimbursedTotal(existing.casoId) > nextReimbursable) throw new Error('Gasto con reembolsos asociados');
    this.expenses = this.expenses.filter((item) => item.id !== id);
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
  }

  async getReimbursements(casoId?: string): Promise<Reembolso[]> {
    return casoId ? this.reimbursements.filter((item) => item.casoId === casoId) : [...this.reimbursements];
  }

  private validateReimbursement(data: Omit<Reembolso, 'id'>, excludeId?: string): void {
    if (!this.cases.some((item) => item.id === data.casoId) || !Number.isFinite(data.monto) ||
      data.monto <= 0 || !data.fecha) throw new Error('Reembolso inválido');
    if (this.reimbursedTotal(data.casoId, excludeId) + data.monto > this.reimbursableTotal(data.casoId)) {
      throw new Error('Reembolso superior al saldo');
    }
  }

  async addReimbursement(data: Omit<Reembolso, 'id'>): Promise<Reembolso> {
    this.validateReimbursement(data);
    const created = { ...data, id: `rem-${Date.now()}` };
    this.reimbursements = [created, ...this.reimbursements];
    setStorage(STORAGE_KEYS.REIMBURSEMENTS, this.reimbursements);
    return created;
  }

  async updateReimbursement(id: string, data: Omit<Reembolso, 'id'>): Promise<Reembolso> {
    const existing = this.reimbursements.find((item) => item.id === id);
    if (!existing || existing.casoId !== data.casoId) throw new Error('Reembolso no encontrado');
    this.validateReimbursement(data, id);
    const updated = { ...existing, ...data };
    this.reimbursements = this.reimbursements.map((item) => item.id === id ? updated : item);
    setStorage(STORAGE_KEYS.REIMBURSEMENTS, this.reimbursements);
    return updated;
  }

  async deleteReimbursement(id: string): Promise<void> {
    if (!this.reimbursements.some((item) => item.id === id)) throw new Error('Reembolso no encontrado');
    this.reimbursements = this.reimbursements.filter((item) => item.id !== id);
    setStorage(STORAGE_KEYS.REIMBURSEMENTS, this.reimbursements);
  }

  /**
   * Restablece los datos al conjunto demo inicial recalculando fechas relativas a hoy.
   */
  async resetToInitial(): Promise<void> {
    const fresh = getInitialMockData();
    const freshTasks = getInitialTasks(fresh.cases.map((caso) => caso.id));
    writeDemoTransaction({
      [STORAGE_KEYS.CLIENTS]: JSON.stringify(fresh.clients),
      [STORAGE_KEYS.CASES]: JSON.stringify(fresh.cases),
      [STORAGE_KEYS.ACTIVITIES]: JSON.stringify(fresh.activities),
      [STORAGE_KEYS.EVENTS]: JSON.stringify(fresh.events),
      [STORAGE_KEYS.PAYMENTS]: JSON.stringify(fresh.payments),
      [STORAGE_KEYS.EXPENSES]: JSON.stringify(fresh.expenses),
      [STORAGE_KEYS.REIMBURSEMENTS]: '[]',
      [STORAGE_KEYS.TASKS]: JSON.stringify(freshTasks),
      [DOCUMENT_STORAGE_KEY]: '[]',
      'abogadospro_configuration_v1:demo': null,
      'abogadospro_assignees_v1:demo': null,
      'abogadospro_studio_expenses_v1:demo': null,
      'abogadospro_appearance_v1:demo-lawyer': null,
      'abogadospro_notification_preferences_v1:demo-lawyer': null,
      'abogadospro_profile_v1:demo-lawyer': null,
    });
    this.tasks = freshTasks;
    this.tasksReadError = null;
    this.clients = fresh.clients;
    this.cases = fresh.cases;
    this.activities = fresh.activities;
    this.events = fresh.events;
    this.payments = fresh.payments;
    this.expenses = fresh.expenses;
    this.reimbursements = [];

  }

  async deleteCaseCascade(casoId: string, documents: DocumentoCaso[]): Promise<DocumentoCaso[]> {
    this.ensureTasksLoaded();
    if (!this.cases.some(caso => caso.id === casoId)) throw new Error('El caso ya no existe.');
    const kept = <T extends { casoId: string }>(items: T[]) => items.filter(item => item.casoId !== casoId);
    const removedDocuments = documents.filter(doc => doc.casoId === casoId);
    const nextCases = this.cases.filter(caso => caso.id !== casoId);
    const nextActivities = kept(this.activities);
    const nextEvents = kept(this.events);
    const nextPayments = kept(this.payments);
    const nextExpenses = kept(this.expenses);
    const nextReimbursements = kept(this.reimbursements);
    const nextTasks = kept(this.tasks);
    writeDemoTransaction({
      [STORAGE_KEYS.CASES]: JSON.stringify(nextCases),
      [STORAGE_KEYS.ACTIVITIES]: JSON.stringify(nextActivities),
      [STORAGE_KEYS.EVENTS]: JSON.stringify(nextEvents),
      [STORAGE_KEYS.PAYMENTS]: JSON.stringify(nextPayments),
      [STORAGE_KEYS.EXPENSES]: JSON.stringify(nextExpenses),
      [STORAGE_KEYS.REIMBURSEMENTS]: JSON.stringify(nextReimbursements),
      [STORAGE_KEYS.TASKS]: JSON.stringify(nextTasks),
      [DOCUMENT_STORAGE_KEY]: JSON.stringify(documents.filter(doc => doc.casoId !== casoId)),
    });
    this.cases = nextCases;
    this.activities = nextActivities;
    this.events = nextEvents;
    this.payments = nextPayments;
    this.expenses = nextExpenses;
    this.reimbursements = nextReimbursements;
    this.tasks = nextTasks;
    return removedDocuments;
  }
}
