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
} from '../types';
import { legalRepository } from '../repositories';
import { calcularAlertaVisual } from '../services/formatters';

interface LegalDataContextType {
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
  addActivity: (data: Omit<Actividad, 'id'>) => Promise<Actividad>;
  addEvent: (data: Omit<Evento, 'id'>) => Promise<Evento>;
  updateEvent: (id: string, data: Omit<Evento, 'id'>) => Promise<Evento>;
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
  const [clients, setClients] = useState<Cliente[]>([]);
  const [cases, setCases] = useState<Caso[]>([]);
  const [activities, setActivities] = useState<Actividad[]>([]);
  const [events, setEvents] = useState<Evento[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [expenses, setExpenses] = useState<Gasto[]>([]);
  const [reimbursements, setReimbursements] = useState<Reembolso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [c, cs, a, e, p, ex, re] = await Promise.all([
        legalRepository.getClients(),
        legalRepository.getCases(),
        legalRepository.getActivities(),
        legalRepository.getEvents(),
        legalRepository.getPayments(),
        legalRepository.getExpenses(),
        legalRepository.getReimbursements(),
      ]);
      setClients(c);
      setCases(cs);
      setActivities(a);
      setEvents(e);
      setPayments(p);
      setExpenses(ex);
      setReimbursements(re);
    } catch (err) {
      console.error('Error loading legal data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Acciones
  const addClient = async (data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> => {
    const created = await legalRepository.addClient(data);
    setClients((prev) => [created, ...prev]);
    return created;
  };

  const updateClient = async (id: string, data: Omit<Cliente, 'id' | 'fechaRegistro'>): Promise<Cliente> => {
    const updated = await legalRepository.updateClient(id, data);
    setClients((prev) => prev.map((client) => client.id === id ? updated : client));
    return updated;
  };

  const addCase = async (data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> => {
    const created = await legalRepository.addCase(data);
    setCases((prev) => [created, ...prev]);
    return created;
  };

  const updateCase = async (id: string, data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> => {
    const updated = await legalRepository.updateCase(id, data);
    setCases((prev) => prev.map((caso) => caso.id === id ? updated : caso));
    return updated;
  };

  const addActivity = async (data: Omit<Actividad, 'id'>): Promise<Actividad> => {
    const created = await legalRepository.addActivity(data);
    setActivities((prev) => [created, ...prev]);
    return created;
  };

  const addEvent = async (data: Omit<Evento, 'id'>): Promise<Evento> => {
    const created = await legalRepository.addEvent(data);
    setEvents((prev) => [created, ...prev]);
    return created;
  };

  const updateEvent = async (id: string, data: Omit<Evento, 'id'>): Promise<Evento> => {
    const updated = await legalRepository.updateEvent(id, data);
    setEvents((prev) => prev.map((evento) => evento.id === id ? updated : evento));
    return updated;
  };

  const addPayment = async (data: Omit<Pago, 'id'>): Promise<Pago> => {
    const created = await legalRepository.addPayment(data);
    setPayments((prev) => [created, ...prev]);
    return created;
  };

  const updatePayment = async (id: string, data: Omit<Pago, 'id'>): Promise<Pago> => {
    const updated = await legalRepository.updatePayment(id, data);
    setPayments((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deletePayment = async (id: string): Promise<void> => {
    await legalRepository.deletePayment(id);
    setPayments((prev) => prev.filter((item) => item.id !== id));
  };

  const addExpense = async (data: Omit<Gasto, 'id'>): Promise<Gasto> => {
    const created = await legalRepository.addExpense(data);
    setExpenses((prev) => [created, ...prev]);
    return created;
  };

  const updateExpense = async (id: string, data: Omit<Gasto, 'id'>): Promise<Gasto> => {
    const updated = await legalRepository.updateExpense(id, data);
    setExpenses((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deleteExpense = async (id: string): Promise<void> => {
    await legalRepository.deleteExpense(id);
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const addReimbursement = async (data: Omit<Reembolso, 'id'>): Promise<Reembolso> => {
    const created = await legalRepository.addReimbursement(data);
    setReimbursements((prev) => [created, ...prev]);
    return created;
  };

  const updateReimbursement = async (id: string, data: Omit<Reembolso, 'id'>): Promise<Reembolso> => {
    const updated = await legalRepository.updateReimbursement(id, data);
    setReimbursements((prev) => prev.map((item) => item.id === id ? updated : item));
    return updated;
  };

  const deleteReimbursement = async (id: string): Promise<void> => {
    await legalRepository.deleteReimbursement(id);
    setReimbursements((prev) => prev.filter((item) => item.id !== id));
  };

  const resetDemoData = async (): Promise<void> => {
    await legalRepository.resetToInitial();
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

      const hoyStr = new Date().toISOString().split('T')[0];
      const proximoEvento = caseEvents.find((e) => e.fecha >= hoyStr) || caseEvents[0];

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
  }, [cases, clients, payments, expenses, reimbursements, events]);

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
        const alertaVisual = calcularAlertaVisual(ev.fecha, ev.hora, ev.tipo);

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
  }, [events, cases, clients]);

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
