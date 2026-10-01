import { ILegalRepository } from './types';
import { Cliente, Caso, Actividad, Evento, Pago, Gasto, Reembolso } from '../types';
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

  constructor() {
    this.clients = getStorage<Cliente[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    this.cases = getStorage<Caso[]>(STORAGE_KEYS.CASES, INITIAL_CASES);
    this.activities = getStorage<Actividad[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    this.events = getStorage<Evento[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    this.payments = getStorage<Pago[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    this.expenses = getStorage<Gasto[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
    this.reimbursements = getStorage<Reembolso[]>(STORAGE_KEYS.REIMBURSEMENTS, []);
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
      id: `cli-${Date.now()}`,
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
      id: `cas-${Date.now()}`,
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
    const updated = { ...existing, ...data };
    this.events = this.events.map((evento) => evento.id === id ? updated : evento);
    setStorage(STORAGE_KEYS.EVENTS, this.events);
    return updated;
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
    this.clients = fresh.clients;
    this.cases = fresh.cases;
    this.activities = fresh.activities;
    this.events = fresh.events;
    this.payments = fresh.payments;
    this.expenses = fresh.expenses;
    this.reimbursements = [];

    setStorage(STORAGE_KEYS.CLIENTS, this.clients);
    setStorage(STORAGE_KEYS.CASES, this.cases);
    setStorage(STORAGE_KEYS.ACTIVITIES, this.activities);
    setStorage(STORAGE_KEYS.EVENTS, this.events);
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
    setStorage(STORAGE_KEYS.REIMBURSEMENTS, this.reimbursements);
  }
}
