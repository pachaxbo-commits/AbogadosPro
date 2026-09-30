import { ILegalRepository } from './types';
import { Cliente, Caso, Actividad, Evento, Pago, Gasto } from '../types';
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
      if (!Array.isArray(parsed) || parsed.length === 0) {
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

  constructor() {
    this.clients = getStorage<Cliente[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    this.cases = getStorage<Caso[]>(STORAGE_KEYS.CASES, INITIAL_CASES);
    this.activities = getStorage<Actividad[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    this.events = getStorage<Evento[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    this.payments = getStorage<Pago[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    this.expenses = getStorage<Gasto[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
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

  // Finanzas: Pagos
  async getPayments(casoId?: string): Promise<Pago[]> {
    if (casoId) {
      return this.payments.filter((p) => p.casoId === casoId);
    }
    return [...this.payments];
  }

  async addPayment(pagoData: Omit<Pago, 'id'>): Promise<Pago> {
    const newPayment: Pago = {
      ...pagoData,
      id: `pag-${Date.now()}`,
    };
    this.payments = [newPayment, ...this.payments];
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    return newPayment;
  }

  // Finanzas: Gastos
  async getExpenses(casoId?: string): Promise<Gasto[]> {
    if (casoId) {
      return this.expenses.filter((g) => g.casoId === casoId);
    }
    return [...this.expenses];
  }

  async addExpense(gastoData: Omit<Gasto, 'id'>): Promise<Gasto> {
    const newExpense: Gasto = {
      ...gastoData,
      id: `gst-${Date.now()}`,
    };
    this.expenses = [newExpense, ...this.expenses];
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
    return newExpense;
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

    setStorage(STORAGE_KEYS.CLIENTS, this.clients);
    setStorage(STORAGE_KEYS.CASES, this.cases);
    setStorage(STORAGE_KEYS.ACTIVITIES, this.activities);
    setStorage(STORAGE_KEYS.EVENTS, this.events);
    setStorage(STORAGE_KEYS.PAYMENTS, this.payments);
    setStorage(STORAGE_KEYS.EXPENSES, this.expenses);
  }
}
