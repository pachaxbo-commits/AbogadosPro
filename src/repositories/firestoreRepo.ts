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
  type Firestore,
} from 'firebase/firestore';
import { validateTask } from '../services/tasks';
import { db } from '../services/firebaseConfig';
import { ILegalRepository } from './types';
import {
  Cliente,
  Caso,
  Actividad,
  Evento,
  Pago,
  Gasto,
  Reembolso,
  Tarea,
  DatosTarea,
  EstadoTarea,
    DatosResultadoEvento,
} from '../types';
import { applyEventResult } from '../services/eventResults';
/**
 * Limpia campos con valor `undefined` para evitar excepciones de Firestore.
 */
function sanitizeForFirestore(data: object): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = Array.isArray(value) ? value.map(item => item && typeof item === 'object' ? sanitizeForFirestore(item) : item) : value && typeof value === 'object' ? sanitizeForFirestore(value) : value;
    }
  }
  return sanitized;
}

export class FirestoreLegalRepository implements ILegalRepository {
  private workspaceId: string;
private firestore: Firestore;
  constructor(workspaceId: string) {
    if (!workspaceId) {
      throw new Error('FirestoreLegalRepository requiere un workspaceId válido para el aislamiento de datos.');
    }
    if (!db) {
  throw new Error('Firebase no está configurado. Firestore no está disponible.');
}
    this.workspaceId = workspaceId;
    this.firestore = db;
  }

  // Rutas de colecciones con aislamiento por Workspace
  private get clientsCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'clientes');
  }

  private get casesCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'casos');
  }

  private get activitiesCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'actividades');
  }

  private get eventsCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'eventos');
  }

  private get paymentsCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'pagos');
  }

  private get expensesCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'gastos');
  }

  private get reimbursementsCol(): CollectionReference<DocumentData> {
    return collection(this.firestore, 'workspaces', this.workspaceId, 'reembolsos');
  }
private get tasksCol(): CollectionReference<DocumentData> {
  return collection(this.firestore, 'workspaces', this.workspaceId, 'tareas');
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
  async saveEventResult(
    casoId: string,
    id: string,
    data: DatosResultadoEvento,
  ): Promise<Evento[]> {
    const events = await this.getEvents();
    const next = applyEventResult(events, casoId, id, data, new Date());

    const previousById = new Map(events.map((event) => [event.id, event]));

    const changedEvents = next.filter((event) => {
      const previous = previousById.get(event.id);

      if (!previous) {
        return true;
      }

      return JSON.stringify(previous) !== JSON.stringify(event);
    });

    await Promise.all(
      changedEvents.map((event) =>
        setDoc(
          doc(this.eventsCol, event.id),
          sanitizeForFirestore(event),
        ),
      ),
    );

    return next;
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
    await setDoc(docRef, sanitizeForFirestore(updated));
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
    await setDoc(docRef, sanitizeForFirestore(updated));
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
    await setDoc(docRef, sanitizeForFirestore(updated));
    return updated;
  }

  async deleteReimbursement(id: string): Promise<void> {
    const docRef = doc(this.reimbursementsCol, id);
    await deleteDoc(docRef);
  }
  // ==========================================
  // TAREAS
  // ==========================================

  async getTasks(casoId?: string): Promise<Tarea[]> {
    let snap;

    if (casoId) {
      const q = query(this.tasksCol, where('casoId', '==', casoId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(this.tasksCol);
    }

    return snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Tarea, 'id'>),
      }))
      .sort((a, b) => {
        const fechaA = a.fechaLimite || '';
        const fechaB = b.fechaLimite || '';
        return fechaA.localeCompare(fechaB);
      });
  }

  async addTask(data: DatosTarea): Promise<Tarea> {
  data = validateTask(data, (await this.getCases()).map(caso => caso.id));
  const docRef = doc(this.tasksCol);
  const stamp = new Date().toISOString();

  const newTask: Tarea = {
    ...data,
    id: docRef.id,
    estado: 'Pendiente',
    createdAt: stamp,
    updatedAt: stamp,
  };

  await setDoc(docRef, sanitizeForFirestore(newTask));
  return newTask;
}


  async updateTask(id: string, data: DatosTarea): Promise<Tarea> {
  data = validateTask(data, (await this.getCases()).map(caso => caso.id));
  const docRef = doc(this.tasksCol, id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('La tarea ya no existe.');
  }

  const current: Tarea = {
    id: snap.id,
    ...(snap.data() as Omit<Tarea, 'id'>),
  };

  const updated: Tarea = {
    ...current,
    ...data,
    id,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, sanitizeForFirestore(updated));

  return updated;
}

  async setTaskStatus(id: string, estado: EstadoTarea, resultadoFinalizacion?: string): Promise<Tarea> {
  const docRef = doc(this.tasksCol, id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('La tarea ya no existe.');
  }

  if (!['Pendiente', 'Completada'].includes(estado)) {
    throw new Error('Estado de tarea inválido.');
  }

  const current: Tarea = {
    id: snap.id,
    ...(snap.data() as Omit<Tarea, 'id'>),
  };

  if (current.estado === estado) {
    return current;
  }

  const stamp = new Date().toISOString();

  const updated: Tarea = {
    ...current,
    estado,
    updatedAt: stamp,
    completedAt: estado === 'Completada' ? stamp : undefined,
    resultadoFinalizacion: estado === 'Completada' ? resultadoFinalizacion?.trim() || undefined : current.resultadoFinalizacion,
  };

  await setDoc(docRef, sanitizeForFirestore(updated));

  return updated;
}

  async deleteTask(id: string): Promise<void> {
    const docRef = doc(this.tasksCol, id);
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
