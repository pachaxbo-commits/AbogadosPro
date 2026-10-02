import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { ILegalRepository } from './types';
import { Cliente, Caso, Actividad, Evento, Pago, Gasto, Reembolso } from '../types';

/**
 * Limpia campos con valor `undefined` para evitar excepciones de Firestore.
 */
function sanitizeForFirestore(data: object): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class FirestoreLegalRepository implements ILegalRepository {
  private workspaceId: string;

  constructor(workspaceId: string) {
    if (!workspaceId) {
      throw new Error('FirestoreLegalRepository requiere un workspaceId válido para el aislamiento de datos.');
    }
    this.workspaceId = workspaceId;
  }

  // Rutas de colecciones con aislamiento por Workspace
  private get clientsCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'clientes');
  }

  private get casesCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'casos');
  }

  private get activitiesCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'actividades');
  }

  private get eventsCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'eventos');
  }

  private get paymentsCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'pagos');
  }

  private get expensesCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'gastos');
  }

  private get reimbursementsCol(): CollectionReference<DocumentData> {
    return collection(db, 'workspaces', this.workspaceId, 'reembolsos');
  }

  // ==========================================
  // CLIENTES
  // ==========================================

  async getClients(): Promise<Cliente[]> {
    const snap = await getDocs(this.clientsCol);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Cliente, 'id'>),
    }));
  }

  async getClientById(id: string): Promise<Cliente | null> {
    const docRef = doc(this.clientsCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Cliente, 'id'>),
    };
  }

  async addClient(clienteData: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> {
    const docRef = doc(this.clientsCol);
    const nowStr = new Date().toISOString().split('T')[0];
    const newClient: Cliente = {
      ...clienteData,
      id: docRef.id,
      fechaRegistro: nowStr,
    };
    await setDoc(docRef, sanitizeForFirestore(newClient));
    return newClient;
  }

  async updateClient(id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> {
    const docRef = doc(this.clientsCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Cliente con id ${id} no encontrado en Firestore`);
    }
    const current = snap.data() as Omit<Cliente, 'id'>;
    const updated: Cliente = {
      ...current,
      ...data,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(data as Record<string, unknown>));
    return updated;
  }

  // ==========================================
  // CASOS
  // ==========================================

  async getCases(): Promise<Caso[]> {
    const snap = await getDocs(this.casesCol);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Caso, 'id'>),
    }));
  }

  async getCaseById(id: string): Promise<Caso | null> {
    const docRef = doc(this.casesCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Caso, 'id'>),
    };
  }

  async getCasesByClientId(clienteId: string): Promise<Caso[]> {
    const q = query(this.casesCol, where('clienteId', '==', clienteId));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Caso, 'id'>),
    }));
  }

  async addCase(casoData: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> {
    const docRef = doc(this.casesCol);
    const nowStr = new Date().toISOString().split('T')[0];
    const newCase: Caso = {
      ...casoData,
      id: docRef.id,
      fechaCreacion: nowStr,
    };
    await setDoc(docRef, sanitizeForFirestore(newCase));
    return newCase;
  }

  async updateCase(id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> {
    const docRef = doc(this.casesCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Caso con id ${id} no encontrado en Firestore`);
    }
    const current = snap.data() as Omit<Caso, 'id'>;
    const updated: Caso = {
      ...current,
      ...data,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(data as Record<string, unknown>));
    return updated;
  }

  // ==========================================
  // ACTIVIDADES
  // ==========================================

  async getActivities(casoId?: string): Promise<Actividad[]> {
    let snap;
    if (casoId) {
      const q = query(this.activitiesCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.activitiesCol);
    }
    const items = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Actividad, 'id'>),
    }));
    // Ordenar descendente por fecha y hora
    return items.sort((a, b) => {
      const dtA = `${a.fecha}T${a.hora || '00:00'}`;
      const dtB = `${b.fecha}T${b.hora || '00:00'}`;
      return dtB.localeCompare(dtA);
    });
  }

  async addActivity(actividadData: Omit<Actividad, 'id'>): Promise<Actividad> {
    const docRef = doc(this.activitiesCol);
    const newActivity: Actividad = {
      ...actividadData,
      id: docRef.id,
    };
    await setDoc(docRef, sanitizeForFirestore(newActivity));
    return newActivity;
  }

  // ==========================================
  // EVENTOS
  // ==========================================

  async getEvents(casoId?: string): Promise<Evento[]> {
    let snap;
    if (casoId) {
      const q = query(this.eventsCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.eventsCol);
    }
    const items = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Evento, 'id'>),
    }));
    // Ordenar ascendente por fecha y hora
    return items.sort((a, b) => {
      const dtA = `${a.fecha}T${a.hora || '00:00'}`;
      const dtB = `${b.fecha}T${b.hora || '00:00'}`;
      return dtA.localeCompare(dtB);
    });
  }

  async addEvent(eventoData: Omit<Evento, 'id'>): Promise<Evento> {
    const docRef = doc(this.eventsCol);
    const newEvent: Evento = {
      ...eventoData,
      id: docRef.id,
    };
    await setDoc(docRef, sanitizeForFirestore(newEvent));
    return newEvent;
  }

  async updateEvent(id: string, data: Omit<Evento, 'id'>): Promise<Evento> {
    const docRef = doc(this.eventsCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Evento con id ${id} no encontrado en Firestore`);
    }
    const current = snap.data() as Omit<Evento, 'id'>;
    const updated: Evento = {
      ...current,
      ...data,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(data as Record<string, unknown>));
    return updated;
  }

  // ==========================================
  // FINANZAS: PAGOS
  // ==========================================

  async getPayments(casoId?: string): Promise<Pago[]> {
    let snap;
    if (casoId) {
      const q = query(this.paymentsCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.paymentsCol);
    }
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Pago, 'id'>),
    }));
  }

  async addPayment(pagoData: Omit<Pago, 'id'>): Promise<Pago> {
    const docRef = doc(this.paymentsCol);
    const newPayment: Pago = {
      ...pagoData,
      id: docRef.id,
    };
    await setDoc(docRef, sanitizeForFirestore(newPayment));
    return newPayment;
  }

  async updatePayment(id: string, pagoData: Omit<Pago, 'id'>): Promise<Pago> {
    const docRef = doc(this.paymentsCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Pago con id ${id} no encontrado en Firestore`);
    }
    const updated: Pago = {
      ...pagoData,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(pagoData as Record<string, unknown>));
    return updated;
  }

  async deletePayment(id: string): Promise<void> {
    const docRef = doc(this.paymentsCol, id);
    await deleteDoc(docRef);
  }

  // ==========================================
  // FINANZAS: GASTOS
  // ==========================================

  async getExpenses(casoId?: string): Promise<Gasto[]> {
    let snap;
    if (casoId) {
      const q = query(this.expensesCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.expensesCol);
    }
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Gasto, 'id'>),
    }));
  }

  async addExpense(gastoData: Omit<Gasto, 'id'>): Promise<Gasto> {
    const docRef = doc(this.expensesCol);
    const newExpense: Gasto = {
      ...gastoData,
      id: docRef.id,
    };
    await setDoc(docRef, sanitizeForFirestore(newExpense));
    return newExpense;
  }

  async updateExpense(id: string, gastoData: Omit<Gasto, 'id'>): Promise<Gasto> {
    const docRef = doc(this.expensesCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Gasto con id ${id} no encontrado en Firestore`);
    }
    const updated: Gasto = {
      ...gastoData,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(gastoData as Record<string, unknown>));
    return updated;
  }

  async deleteExpense(id: string): Promise<void> {
    const docRef = doc(this.expensesCol, id);
    await deleteDoc(docRef);
  }

  // ==========================================
  // FINANZAS: REEMBOLSOS
  // ==========================================

  async getReimbursements(casoId?: string): Promise<Reembolso[]> {
    let snap;
    if (casoId) {
      const q = query(this.reimbursementsCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.reimbursementsCol);
    }
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Reembolso, 'id'>),
    }));
  }

  async addReimbursement(reembolsoData: Omit<Reembolso, 'id'>): Promise<Reembolso> {
    const docRef = doc(this.reimbursementsCol);
    const newReimbursement: Reembolso = {
      ...reembolsoData,
      id: docRef.id,
    };
    await setDoc(docRef, sanitizeForFirestore(newReimbursement));
    return newReimbursement;
  }

  async updateReimbursement(id: string, reembolsoData: Omit<Reembolso, 'id'>): Promise<Reembolso> {
    const docRef = doc(this.reimbursementsCol, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error(`Reembolso con id ${id} no encontrado en Firestore`);
    }
    const updated: Reembolso = {
      ...reembolsoData,
      id,
    };
    await updateDoc(docRef, sanitizeForFirestore(reembolsoData as Record<string, unknown>));
    return updated;
  }

  async deleteReimbursement(id: string): Promise<void> {
    const docRef = doc(this.reimbursementsCol, id);
    await deleteDoc(docRef);
  }

  /**
   * En producción bajo Firestore real, el reinicio masivo demo no aplica
   * para no destruir datos de abogados en producción.
   */
  async resetToInitial(): Promise<void> {
    console.info('resetToInitial() llamado en FirestoreLegalRepository: operación segura omitida en producción.');
  }
}
