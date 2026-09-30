import { Cliente, Caso, Actividad, Evento, Pago, Gasto } from '../types';

export interface ILegalRepository {
  // Clientes
  getClients(): Promise<Cliente[]>;
  getClientById(id: string): Promise<Cliente | null>;
  addClient(cliente: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente>;

  // Casos
  getCases(): Promise<Caso[]>;
  getCaseById(id: string): Promise<Caso | null>;
  getCasesByClientId(clienteId: string): Promise<Caso[]>;
  addCase(caso: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso>;

  // Actividades
  getActivities(casoId?: string): Promise<Actividad[]>;
  addActivity(actividad: Omit<Actividad, 'id'>): Promise<Actividad>;

  // Eventos
  getEvents(casoId?: string): Promise<Evento[]>;
  addEvent(evento: Omit<Evento, 'id'>): Promise<Evento>;

  // Finanzas: Pagos
  getPayments(casoId?: string): Promise<Pago[]>;
  addPayment(pago: Omit<Pago, 'id'>): Promise<Pago>;

  // Finanzas: Gastos
  getExpenses(casoId?: string): Promise<Gasto[]>;
  addExpense(gasto: Omit<Gasto, 'id'>): Promise<Gasto>;

  // Utilidad para reiniciar datos del demo si el usuario lo desea
  resetToInitial(): Promise<void>;
}
