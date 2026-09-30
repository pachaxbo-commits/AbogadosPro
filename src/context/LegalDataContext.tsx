import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cliente,
  Caso,
  Actividad,
  Evento,
  Pago,
  Gasto,
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
  loading: boolean;

  // Acciones de registro
  addClient: (data: Omit<Cliente, 'id' | 'fechaRegistro'>) => Promise<Cliente>;
  addCase: (data: Omit<Caso, 'id' | 'fechaCreacion'>) => Promise<Caso>;
  addActivity: (data: Omit<Actividad, 'id'>) => Promise<Actividad>;
  addEvent: (data: Omit<Evento, 'id'>) => Promise<Evento>;
  addPayment: (data: Omit<Pago, 'id'>) => Promise<Pago>;
  addExpense: (data: Omit<Gasto, 'id'>) => Promise<Gasto>;
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
  const [loading, setLoading] = useState<boolean>(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [c, cs, a, e, p, ex] = await Promise.all([
        legalRepository.getClients(),
        legalRepository.getCases(),
        legalRepository.getActivities(),
        legalRepository.getEvents(),
        legalRepository.getPayments(),
        legalRepository.getExpenses(),
      ]);
      setClients(c);
      setCases(cs);
      setActivities(a);
      setEvents(e);
      setPayments(p);
      setExpenses(ex);
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

  const addCase = async (data: Omit<Caso, 'id' | 'fechaCreacion'>): Promise<Caso> => {
    const created = await legalRepository.addCase(data);
    setCases((prev) => [created, ...prev]);
    return created;
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

  const addPayment = async (data: Omit<Pago, 'id'>): Promise<Pago> => {
    const created = await legalRepository.addPayment(data);
    setPayments((prev) => [created, ...prev]);
    return created;
  };

  const addExpense = async (data: Omit<Gasto, 'id'>): Promise<Gasto> => {
    const created = await legalRepository.addExpense(data);
    setExpenses((prev) => [created, ...prev]);
    return created;
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
        proximoEvento,
      };
    });
  }, [cases, clients, payments, expenses, events]);

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
      const totalFees = clientCases.reduce((sum, c) => sum + c.honorariosAcordados, 0);
      const totalPaid = payments
        .filter((p) => clientCaseIds.has(p.casoId))
        .reduce((sum, p) => sum + p.monto, 0);

      const saldoPendienteTotal = Math.max(0, totalFees - totalPaid);

      return {
        ...client,
        casosTotal: clientCases.length,
        casosActivos: activeCases.length,
        saldoPendienteTotal,
      };
    });
  }, [clients, cases, payments]);

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
    const saldoPendiente = Math.max(0, totalAcordado - totalCobrado);
    const totalGastos = expenses.reduce((sum, g) => sum + g.monto, 0);

    return {
      totalAcordado,
      totalCobrado,
      saldoPendiente,
      totalGastos,
    };
  }, [cases, payments, expenses]);

  return (
    <LegalDataContext.Provider
      value={{
        clients,
        cases,
        activities,
        events,
        payments,
        expenses,
        loading,
        addClient,
        addCase,
        addActivity,
        addEvent,
        addPayment,
        addExpense,
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
