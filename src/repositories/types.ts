import { Cliente, Caso, Actividad, Evento, Pago, Gasto, Reembolso } from '../types';

export interface ILegalRepository {
  // Clientes
  getClients(): Promise<Cliente[]>;
  getClientById(id: string): Promise<Cliente | null>;
  addClient(cliente: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente>;
  updateClient(id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente>;

  // Casos
  getCases(): Promise<Caso[]>;
  getCaseById(id: string): Promise<Caso | null>;
  getCasesByClientId(clienteId: string): Promise<Caso[]>;
  addCase(caso: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso>;
  updateCase(id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso>;

  // Actividades
  getActivities(casoId?: string): Promise<Actividad[]>;
  addActivity(actividad: Omit<Actividad, 'id'>): Promise<Actividad>;

  // Eventos
  getEvents(casoId?: string): Promise<Evento[]>;
  addEvent(evento: Omit<Evento, 'id'>): Promise<Evento>;
  updateEvent(id: string, data: Omit<Evento, 'id'>): Promise<Evento>;

  // Finanzas: Pagos
  getPayments(casoId?: string): Promise<Pago[]>;
  addPayment(pago: Omit<Pago, 'id'>): Promise<Pago>;
  updatePayment(id: string, pago: Omit<Pago, 'id'>): Promise<Pago>;
  deletePayment(id: string): Promise<void>;

  // Finanzas: Gastos
  getExpenses(casoId?: string): Promise<Gasto[]>;
  addExpense(gasto: Omit<Gasto, 'id'>): Promise<Gasto>;
  updateExpense(id: string, gasto: Omit<Gasto, 'id'>): Promise<Gasto>;
  deleteExpense(id: string): Promise<void>;

  getReimbursements(casoId?: string): Promise<Reembolso[]>;
  addReimbursement(reembolso: Omit<Reembolso, 'id'>): Promise<Reembolso>;
  updateReimbursement(id: string, reembolso: Omit<Reembolso, 'id'>): Promise<Reembolso>;
  deleteReimbursement(id: string): Promise<void>;

  // Utilidad para reiniciar datos del demo si el usuario lo desea
  resetToInitial(): Promise<void>;
}
