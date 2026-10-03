import { useTaskClock } from '../hooks/useTaskClock';
import { taskToday } from '../services/tasks';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cliente,
  Caso,
  Actividad,
  Evento,
  Pago,
  Gasto,
  Reembolso,
  CasoConDetalles,
  ClienteConResumen,
  EventoConCaso,
  Tarea,
  DatosTarea,
  EstadoTarea,
  DocumentoCaso,
  DatosDocumento,
  DatosResultadoEvento,
} from '../types';
import { eventState, eventHasPassed } from '../services/eventResults';
import { LocalDocumentRepository, DOCUMENT_STORAGE_KEY } from '../repositories/documentsRepository';
import { TemporaryDocumentFiles } from '../services/documentFiles';
import { configurationRepository } from '../repositories/configurationRepository';
import { LocalStorageLegalRepository } from '../repositories/localStorageRepo';
import { ILegalRepository, demoLegalRepository, FirestoreLegalRepository } from '../repositories';
import { calcularAlertaVisual } from '../services/formatters';
import { useAuth } from './AuthContext';
import { canCreateClient, canCreateCase } from '../config/plans';

interface LegalDataContextType {
  documents: DocumentoCaso[];
  documentsError: string;
  addDocument: (casoId: string, data: DatosDocumento, file: File) => Promise<DocumentoCaso>;
  addDocuments: (casoId: string, items: { data: DatosDocumento; file: File }[]) => Promise<DocumentoCaso[]>;
  updateDocument: (casoId: string, id: string, data: DatosDocumento) => Promise<DocumentoCaso>;
  deleteDocument: (casoId: string, id: string) => Promise<void>;
  getDocumentUrl: (casoId: string, id: string) => Promise<string | null>;
  tasks: Tarea[];
  tasksError: string;
  addTask: (data: DatosTarea) => Promise<Tarea>;
  updateTask: (id: string, data: DatosTarea) => Promise<Tarea>;
  setTaskStatus: (id: string, estado: EstadoTarea) => Promise<Tarea>;
  completeTask: (id: string, resultado: string, files: { file: File; nombre: string; categoria: string }[]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clients: Cliente[];
  cases: Caso[];
  activities: Actividad[];
  events: Evento[];
  payments: Pago[];
  expenses: Gasto[];
  reimbursements: Reembolso[];
  loading: boolean;

  // Acciones de registro
  addClient: (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => Promise<Cliente>;
  updateClient: (id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>) => Promise<Cliente>;
  addCase: (data: Omit<Caso, 'id' | 'fechaCreacion'>) => Promise<Caso>;
  updateCase: (id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>) => Promise<Caso>;
  deleteCase: (id: string) => Promise<void>;
  addActivity: (data: Omit<Actividad, 'id'>) => Promise<Actividad>;
  addEvent: (data: Omit<Evento, 'id'>) => Promise<Evento>;
  updateEvent: (id: string, data: Omit<Evento, 'id'>) => Promise<Evento>;
  saveEventResult: (casoId: string, id: string, data: DatosResultadoEvento) => Promise<void>;
  addPayment: (data: Omit<Pago, 'id'>) => Promise<Pago>;
  updatePayment: (id: string, data: Omit<Pago, 'id'>) => Promise<Pago>;
  deletePayment: (id: string) => Promise<void>;
  addExpense: (data: Omit<Gasto, 'id'>) => Promise<Gasto>;
  updateExpense: (id: string, data: Omit<Gasto, 'id'>) => Promise<Gasto>;
  deleteExpense: (id: string) => Promise<void>;
  addReimbursement: (data: Omit<Reembolso, 'id'>) => Promise<Reembolso>;
  updateReimbursement: (id: string, data: Omit<Reembolso, 'id'>) => Promise<Reembolso>;
  deleteReimbursement: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;

  // Consultas calculadas
  getCaseWithDetails: (caseId: string) => CasoConDetalles | undefined;
  clientsWithSummary: ClienteConResumen[];
  casesWithDetails: CasoConDetalles[];
  eventsWithCase: EventoConCaso[];
  financialTotals: {
    totalAcordado: number;
    totalCobrado: number;
    saldoPendiente: number;
    totalGastos: number;
    gastosReembolsables: number;
    totalReembolsado: number;
    gastosPendientes: number;
    totalPendienteClientes: number;
  };
}

const LegalDataContext = createContext<LegalDataContextType | undefined>(undefined);

export const LegalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isDemo, loading } = useAuth();
  if (loading) return <p className="p-6">Cargando…</p>;
  return <LegalDataSession key={currentUser ? currentUser.uid + ':' + userProfile?.workspaceId : isDemo ? 'demo' : 'guest'}>{children}</LegalDataSession>;
};
const LegalDataSession: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const eventNow = useTaskClock();
  const [documents, setDocuments] = useState<DocumentoCaso[]>([]);
  const [documentsError, setDocumentsError] = useState('');
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [tasksError, setTasksError] = useState('');
  const { currentUser, userProfile, isDemo, loading: authLoading } = useAuth();

  const [clients, setClients] = useState<Cliente[]>([]);
  const [cases, setCases] = useState<Caso[]>([]);
  const [activities, setActivities] = useState<Actividad[]>([]);
  const [events, setEvents] = useState<Evento[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [expenses, setExpenses] = useState<Gasto[]>([]);
  const [reimbursements, setReimbursements] = useState<Reembolso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const workspaceId = userProfile?.workspaceId;

  // Instancia activa del repositorio: Firestore por workspace si está autenticado, Demo si no.
  const activeRepository: ILegalRepository = useMemo(() => {
    if (currentUser && workspaceId) {
      return new FirestoreLegalRepository(workspaceId);
    }
    return demoLegalRepository;
  }, [currentUser, workspaceId]);

  const documentRepository = useMemo(() => new LocalDocumentRepository(
    new TemporaryDocumentFiles(), async (id) => Boolean(await activeRepository.getCaseById(id)),
    currentUser ? DOCUMENT_STORAGE_KEY + ':' + encodeURIComponent(workspaceId || currentUser.uid) : DOCUMENT_STORAGE_KEY,
    () => configurationRepository.get(currentUser ? workspaceId || currentUser.uid : 'demo').categories.documents,
  ), [activeRepository, currentUser, workspaceId]);

  const loadAll = useCallback(async () => {
    // Si aún está resolviendo auth, esperar
    if (authLoading) return;

    // Si no está autenticado ni en modo demo, no cargar datos demo
    if ((!currentUser && !isDemo) || (currentUser && !workspaceId)) {
      setTasks([]);
      setDocuments([]);
      setClients([]);
      setCases([]);
      setActivities([]);
      setEvents([]);
      setPayments([]);
      setExpenses([]);
      setReimbursements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setTasksError('');
      setDocumentsError('');
      const [c, cs, a, e, p, ex, re, ts, docs] = await Promise.all([
        activeRepository.getClients(),
        activeRepository.getCases(),
        activeRepository.getActivities(),
        activeRepository.getEvents(),
        activeRepository.getPayments(),
        activeRepository.getExpenses(),
        activeRepository.getReimbursements(),
        activeRepository.getTasks().catch((err) => {
  setTasksError(err instanceof Error ? err.message : 'No se pudieron cargar las tareas.');
  return [];
}),
documentRepository.getDocuments().catch((err) => {
  setDocumentsError(err instanceof Error ? err.message : 'No se pudieron cargar los documentos.');
  return [];
}),
      ]);
      setClients(c);
      setCases(cs);
      setActivities(a);
      setEvents(e);
      setPayments(p);
      setExpenses(ex);
      setReimbursements(re);
      setTasks(ts);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading legal data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeRepository, documentRepository, authLoading, currentUser, isDemo, workspaceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Acciones
  const saveEventResult = async (casoId: string, id: string, data: DatosResultadoEvento) => {
    setEvents(await activeRepository.saveEventResult(casoId, id, data));
  };
  const getDocumentUrl = useCallback((casoId: string, id: string) => documentRepository.getFileUrl(casoId, id), [documentRepository]);
  const addDocument = async (casoId: string, data: DatosDocumento, file: File) => {
    const created = await documentRepository.addDocument(casoId, data, file);
    setDocuments((prev) => [created, ...prev]);
    return created;
  };
  const addDocuments = async (casoId: string, items: { data: DatosDocumento; file: File }[]) => {
    const created = await documentRepository.addDocuments(casoId, items);
    setDocuments((prev) => [...created, ...prev]);
    return created;
  };
  const updateDocument = async (casoId: string, id: string, data: DatosDocumento) => {
    const updated = await documentRepository.updateDocument(casoId, id, data);
    setDocuments((prev) => prev.map((doc) => doc.id === id && doc.casoId === casoId ? updated : doc));
    return updated;
  };
  const deleteDocument = async (casoId: string, id: string) => {
    await documentRepository.deleteDocument(casoId, id);
    setDocuments((prev) => prev.filter((doc) => doc.id !== id || doc.casoId !== casoId));
  };
  const addTask = async (data: DatosTarea): Promise<Tarea> => {
    const created = await activeRepository.addTask(data);
    setTasks((prev) => [created, ...prev]);
    return created;
  };
  const updateTask = async (id: string, data: DatosTarea): Promise<Tarea> => {
    const updated = await activeRepository.updateTask(id, data);
    setTasks((prev) => prev.map((task) => task.id === id ? updated : task));
    return updated;
  };
  const setTaskStatus = async (id: string, estado: EstadoTarea): Promise<Tarea> => {
    const updated = await activeRepository.setTaskStatus(id, estado);
    setTasks((prev) => prev.map((task) => task.id === id ? updated : task));
    return updated;
  };
  const completeTask = async (id: string, resultado: string, files: { file: File; nombre: string; categoria: string }[]): Promise<void> => {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.estado !== 'Pendiente') throw new Error('La tarea ya no está pendiente.');
    const created = files.length ? await documentRepository.addDocuments(task.casoId, files.map(({ file, nombre, categoria }) => ({ file, data: { nombre, categoria, taskId: id } }))) : [];
    try {
      const updated = await activeRepository.setTaskStatus(id, 'Completada', resultado);
      setDocuments((prev) => [...created, ...prev]);
      setTasks((prev) => prev.map((item) => item.id === id ? updated : item));
    } catch (error) {
      if (created.length) await documentRepository.removeDocuments(task.casoId, created.map((item) => item.id));
      throw error;
    }
  };
  const deleteTask = async (id: string): Promise<void> => {
    await activeRepository.deleteTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };
  // Acciones de inserción y modificación con validación de límites de plan
  const addClient = async (data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> => {
    if (!isDemo && currentUser) {
      const validation = canCreateClient(userProfile, clients.length);
      if (!validation.allowed) {
        throw new Error(validation.reason || 'Límite de clientes alcanzado en su plan.');
      }
    }
    const created = await activeRepository.addClient(data);
    setClients((prev) => [created, ...prev]);
    return created;
  };

  const updateClient = async (id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> => {
    const updated = await activeRepository.updateClient(id, data);
    setClients((prev) => prev.map((client) => client.id === id ? updated : client));
    return updated;
  };

  const addCase = async (data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> => {
    if (!isDemo && currentUser) {
      const validation = canCreateCase(userProfile, cases.length);
      if (!validation.allowed) {
        throw new Error(validation.reason || 'Límite de casos alcanzado en su plan.');
      }
    }
    const created = await activeRepository.addCase(data);
    setCases((prev) => [created, ...prev]);
    return created;
  };

  const updateCase = async (id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> => {
    const updated = await activeRepository.updateCase(id, data);
    setCases((prev) => prev.map((caso) => caso.id === id ? updated : caso));
    return updated;
  };

  const addActivity = async (data: Omit<Actividad, 'id'>): Promise<Actividad> => {
    const created = await activeRepository.addActivity(data);
    setActivities((prev) => [created, ...prev]);
    return created;
  };

  const addEvent = async (data: Omit<Evento, 'id'>): Promise<Evento> => {
    const created = await activeRepository.addEvent(data);
    setEvents((prev) => [created, ...prev]);
    return created;
  };

  const updateEvent = async (id: string, data: Omit<Evento, 'id'>): Promise<Evento> => {
    const updated = await activeRepository.updateEvent(id, data);
    setEvents((prev) => prev.map((evento) => evento.id === id ? updated : evento));
    return updated;
  };

  const addPayment = async (data: Omit<Pago, 'id'>): Promise<Pago> => {
    const created = await activeRepository.addPayment(data);
    setPayments((prev) => [created, ...prev]);
    return created;
  };

  const updatePayment = async (id: string, data: Omit<Pago, 'id'>): Promise<Pago> => {
    const updated = await activeRepository.updatePayment(id, data);
    setPayments((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deletePayment = async (id: string): Promise<void> => {
    await activeRepository.deletePayment(id);
    setPayments((prev) => prev.filter((item) => item.id !== id));
  };

  const addExpense = async (data: Omit<Gasto, 'id'>): Promise<Gasto> => {
    const created = await activeRepository.addExpense(data);
    setExpenses((prev) => [created, ...prev]);
    return created;
  };

  const updateExpense = async (id: string, data: Omit<Gasto, 'id'>): Promise<Gasto> => {
    const updated = await activeRepository.updateExpense(id, data);
    setExpenses((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deleteExpense = async (id: string): Promise<void> => {
    await activeRepository.deleteExpense(id);
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const addReimbursement = async (data: Omit<Reembolso, 'id'>): Promise<Reembolso> => {
    const created = await activeRepository.addReimbursement(data);
    setReimbursements((prev) => [created, ...prev]);
    return created;
  };

  const updateReimbursement = async (id: string, data: Omit<Reembolso, 'id'>): Promise<Reembolso> => {
    const updated = await activeRepository.updateReimbursement(id, data);
    setReimbursements((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deleteReimbursement = async (id: string): Promise<void> => {
    await activeRepository.deleteReimbursement(id);
    setReimbursements((prev) => prev.filter((item) => item.id !== id));
  };

  const resetDemoData = async (): Promise<void> => {
    if (!isDemo) {
      console.warn('El restablecimiento de datos está reservado exclusivamente para el Modo Demo.');
      return;
    }
    await demoLegalRepository.resetToInitial();
    await documentRepository.clearTemporaryFiles();
    await loadAll();
    window.dispatchEvent(new Event('abogadospro:demo-reset'));
  };

  const deleteCase = async (id: string): Promise<void> => {
    if (!isDemo || !(activeRepository instanceof LocalStorageLegalRepository)) {
      throw new Error('La eliminación de casos solo está disponible en el entorno local de demostración.');
    }
    const allDocuments = await documentRepository.getDocuments();
    const removed = await activeRepository.deleteCaseCascade(id, allDocuments);
    await documentRepository.releaseFiles(removed);
    await loadAll();
  };

  // Modelos calculados
  const casesWithDetails: CasoConDetalles[] = useMemo(() => {
    const clientMap = new Map(clients.map((c) => [c.id, c.nombre]));

    return cases.map((caso) => {
      const casePayments = payments.filter((p) => p.casoId === caso.id);
      const totalPagado = casePayments.reduce((sum, p) => sum + p.monto, 0);
      const saldoPendiente = Math.max(0, caso.honorariosAcordados - totalPagado);

      const caseExpenses = expenses.filter((g) => g.casoId === caso.id);
      const totalGastos = caseExpenses.reduce((sum, g) => sum + g.monto, 0);
      const gastosReembolsables = caseExpenses.filter((g) => g.reembolsable === true)
        .reduce((sum, g) => sum + g.monto, 0);
      const totalReembolsado = reimbursements.filter((r) => r.casoId === caso.id)
        .reduce((sum, r) => sum + r.monto, 0);
      const gastosPendientes = Math.max(0, gastosReembolsables - totalReembolsado);
      const totalPendiente = saldoPendiente + gastosPendientes;

      // Próximo evento (más cercano a hoy o futuro)
      const caseEvents = events
        .filter((e) => e.casoId === caso.id)
        .sort((a, b) => {
          const dtA = `${a.fecha}T${a.hora || '00:00'}`;
          const dtB = `${b.fecha}T${b.hora || '00:00'}`;
          return dtA.localeCompare(dtB);
        });

      const hoyStr = taskToday(eventNow);
      const proximoEvento = caseEvents.find((e) => e.fecha >= hoyStr && !eventHasPassed(e, eventNow) && eventState(e) === 'Próximo');

      return {
        ...caso,
        clienteNombre: clientMap.get(caso.clienteId) || 'Cliente no especificado',
        totalPagado,
        saldoPendiente,
        totalGastos,
        gastosReembolsables,
        totalReembolsado,
        gastosPendientes,
        totalPendiente,
        proximoEvento,
      };
    });
  }, [cases, clients, payments, expenses, reimbursements, events, eventNow]);

  const getCaseWithDetails = useCallback(
    (caseId: string): CasoConDetalles | undefined => {
      return casesWithDetails.find((c) => c.id === caseId);
    },
    [casesWithDetails]
  );

  const clientsWithSummary: ClienteConResumen[] = useMemo(() => {
    return clients.map((client) => {
      const clientCases = cases.filter((c) => c.clienteId === client.id);
      const activeCases = clientCases.filter((c) => c.estado === 'Activo' || c.estado === 'En trámite');

      const clientCaseIds = new Set(clientCases.map((c) => c.id));
      const clientDetailedCases = casesWithDetails.filter((c) => clientCaseIds.has(c.id));
      const honorariosPendientesTotal = clientDetailedCases.reduce((sum, c) => sum + c.saldoPendiente, 0);
      const gastosPendientesTotal = clientDetailedCases.reduce((sum, c) => sum + c.gastosPendientes, 0);
      const saldoPendienteTotal = honorariosPendientesTotal + gastosPendientesTotal;

      return {
        ...client,
        casosTotal: clientCases.length,
        casosActivos: activeCases.length,
        saldoPendienteTotal,
        honorariosPendientesTotal,
        gastosPendientesTotal,
      };
    });
  }, [clients, cases, casesWithDetails]);

  const eventsWithCase: EventoConCaso[] = useMemo(() => {
    const caseMap = new Map(cases.map((c) => [c.id, c]));
    const clientMap = new Map(clients.map((c) => [c.id, c.nombre]));

    return events
      .map((ev) => {
        const caso = caseMap.get(ev.casoId);
        const clienteNombre = caso ? clientMap.get(caso.clienteId) || 'Desconocido' : 'Desconocido';
        const casoNombre = caso ? caso.nombre : 'Caso no especificado';
        const casoArea = caso ? caso.area : 'Civil';
        const alertaVisual = eventState(ev) === 'Próximo' && !eventHasPassed(ev, eventNow) ? calcularAlertaVisual(ev.fecha, ev.hora, ev.tipo) : undefined;

        return {
          ...ev,
          casoNombre,
          clienteNombre,
          casoArea,
          alertaVisual,
        };
      })
      .sort((a, b) => {
        const dtA = `${a.fecha}T${a.hora || '00:00'}`;
        const dtB = `${b.fecha}T${b.hora || '00:00'}`;
        return dtA.localeCompare(dtB);
      });
  }, [events, cases, clients, eventNow]);

  const financialTotals = useMemo(() => {
    const totalAcordado = cases.reduce((sum, c) => sum + c.honorariosAcordados, 0);
    const totalCobrado = payments.reduce((sum, p) => sum + p.monto, 0);
    const saldoPendiente = casesWithDetails.reduce((sum, c) => sum + c.saldoPendiente, 0);
    const totalGastos = expenses.reduce((sum, g) => sum + g.monto, 0);
    const gastosReembolsables = casesWithDetails.reduce((sum, c) => sum + c.gastosReembolsables, 0);
    const totalReembolsado = reimbursements.reduce((sum, r) => sum + r.monto, 0);
    const gastosPendientes = casesWithDetails.reduce((sum, c) => sum + c.gastosPendientes, 0);
    const totalPendienteClientes = saldoPendiente + gastosPendientes;

    return {
      totalAcordado,
      totalCobrado,
      saldoPendiente,
      totalGastos,
      gastosReembolsables,
      totalReembolsado,
      gastosPendientes,
      totalPendienteClientes,
    };
  }, [cases, payments, expenses, reimbursements, casesWithDetails]);

  return (
    <LegalDataContext.Provider
      value={{
        documents, documentsError, addDocument, addDocuments, updateDocument, deleteDocument,
        getDocumentUrl,
        saveEventResult,
        tasks,
        tasksError,
        addTask,
        updateTask,
        setTaskStatus,
        completeTask,
        deleteTask,
        clients,
        cases,
        activities,
        events,
        payments,
        expenses,
        reimbursements,
        loading,
        addClient,
        updateClient,
        addCase,
        updateCase,
        addActivity,
        addEvent,
        updateEvent,
        addPayment,
        updatePayment,
        deletePayment,
        addExpense,
        updateExpense,
        deleteExpense,
        addReimbursement,
        updateReimbursement,
        deleteReimbursement,
        resetDemoData,
        deleteCase,
        getCaseWithDetails,
        clientsWithSummary,
        casesWithDetails,
        eventsWithCase,
        financialTotals,
      }}
    >
      {children}
    </LegalDataContext.Provider>
  );
};

export const useLegalData = (): LegalDataContextType => {
  const context = useContext(LegalDataContext);
  if (!context) {
    throw new Error('useLegalData must be used within a LegalDataProvider');
  }
  return context;
};
