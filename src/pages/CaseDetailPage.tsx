import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatusBadge, AreaBadge, JudicialIdBadge } from '../components/common/StatusBadge';
import { ActivityTimeline } from '../components/activities/ActivityTimeline';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { EventMenu } from '../components/events/EventMenu';
import { WhatsAppContact } from '../components/common/WhatsAppContact';
import { EventFormModal } from '../components/events/EventFormModal';
import { PaymentFormModal } from '../components/finances/PaymentFormModal';
import { ExpenseFormModal } from '../components/finances/ExpenseFormModal';
import { ReimbursementFormModal } from '../components/finances/ReimbursementFormModal';
import { FinancialRowActions } from '../components/finances/FinancialRowActions';
import { Modal } from '../components/common/Modal';
import { Pago, Gasto, Reembolso, Evento } from '../types';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskSummary } from '../components/tasks/TaskSummary';
import { CaseDocuments } from '../components/documents/CaseDocuments';
import { EventResultAction, EventResultStatus } from '../components/events/EventResultAction';
import { formatBs, formatFecha, formatHora, getTodayIsoString } from '../services/formatters';
import { AlertBadge } from '../components/common/AlertBadge';
import {
  User,
  ArrowLeft,
  Calendar,
  Wallet,
  Clock,
  Plus,
  FileText,
  Receipt,
  Info,
  ChevronDown,
} from 'lucide-react';

type TabType = 'resumen' | 'actividad' | 'agenda' | 'documentos' | 'finanzas';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getCaseWithDetails,
    clients,
    activities,
    payments,
    expenses,
    reimbursements,
    deletePayment,
    deleteExpense,
    deleteReimbursement,
    eventsWithCase,
    documents,
    documentsError,
  } = useLegalData();

  const tabParam = searchParams.get('tab') as TabType;
  const activeTab: TabType = ['resumen', 'actividad', 'agenda', 'documentos', 'finanzas'].includes(tabParam)
    ? tabParam
    : 'resumen';
  const selectedEventId = searchParams.get('evento');
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<Evento | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'agenda' || !selectedEventId || !eventsWithCase.some((event) => event.id === selectedEventId && event.casoId === id)) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`evento-${selectedEventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedEventId(selectedEventId);
      timeout = setTimeout(() => setHighlightedEventId(null), 1800);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timeout) clearTimeout(timeout);
    };
  }, [activeTab, selectedEventId, eventsWithCase, id]);

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Modales
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReimbursementModalOpen, setIsReimbursementModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Pago | undefined>();
  const [selectedExpense, setSelectedExpense] = useState<Gasto | undefined>();
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reembolso | undefined>();
  const [pendingDelete, setPendingDelete] = useState<{ type: 'pago' | 'gasto' | 'reembolso'; id: string; monto: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [financeError, setFinanceError] = useState('');
  const [financeSuccess, setFinanceSuccess] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState('');

  const caso = id ? getCaseWithDetails(id) : undefined;

  if (!caso) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Expediente no encontrado</h2>
        <p className="text-sm text-slate-500 mt-1">El expediente solicitado no existe o fue eliminado.</p>
        <Link
          to="/casos"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-900 rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Casos</span>
        </Link>
      </div>
    );
  }

  // Actividades del caso
  const caseActivities = activities.filter((a) => a.casoId === caso.id);
  const documentCount = documents.filter((doc) => doc.casoId === caso.id).length;

  // Eventos del caso (ordenados cronológicamente más próximos primero)
  const caseEvents = eventsWithCase.filter((e) => e.casoId === caso.id);
  const urgentEvent = caseEvents.find((event) =>
    event.fecha >= getTodayIsoString() &&
    (event.alertaVisual?.tipo === 'hoy' || event.alertaVisual?.tipo === 'urgente')
  );

  // Pagos y Gastos
  const casePayments = payments
    .filter((p) => p.casoId === caso.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const caseExpenses = expenses
    .filter((g) => g.casoId === caso.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const caseReimbursements = reimbursements
    .filter((r) => r.casoId === caso.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const confirmDelete = async () => {
    if (!pendingDelete || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setFinanceError('');
    try {
      if (pendingDelete.type === 'pago') await deletePayment(pendingDelete.id);
      else if (pendingDelete.type === 'gasto') await deleteExpense(pendingDelete.id);
      else await deleteReimbursement(pendingDelete.id);
      setFinanceSuccess(`${pendingDelete.type === 'pago' ? 'Pago' : pendingDelete.type === 'gasto' ? 'Gasto' : 'Reembolso'} eliminado correctamente.`);
      setPendingDelete(null);
    } catch (error) {
      console.error(error);
      setFinanceError(pendingDelete.type === 'gasto' && error instanceof Error && error.message === 'Gasto con reembolsos asociados'
        ? 'No se puede eliminar este gasto mientras existan reembolsos que lo superen.'
        : 'No se pudo eliminar el registro. Intenta nuevamente.');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          to="/casos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Casos</span>
        </Link>
      </div>

      {/* CABECERA PRINCIPAL DEL CASO */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AreaBadge area={caso.area} />
              <StatusBadge status={caso.estado} />
              <JudicialIdBadge
                tipo={caso.tipoIdentificacionJudicial}
                numero={caso.numeroIdentificacionJudicial}
              />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Rol: <strong className="font-semibold text-slate-900">{caso.participacion}</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {caso.nombre}
            </h1>

            {urgentEvent?.alertaVisual && (
              <AlertBadge alerta={{
                ...urgentEvent.alertaVisual,
                mensaje: urgentEvent.alertaVisual.tipo === 'hoy'
                  ? `${urgentEvent.tipo} hoy${urgentEvent.hora ? ` · ${formatHora(urgentEvent.hora)}` : ''}`
                  : urgentEvent.alertaVisual.mensaje,
              }} />
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente:</span>
                <Link
                  to={`/clientes/${caso.clienteId}`}
                  className="font-semibold text-brand-900 hover:underline"
                >
                  {caso.clienteNombre}
                </Link>
                <WhatsAppContact phone={clients.find(client => client.id === caso.clienteId)?.telefono} message={`Buen día, ${caso.clienteNombre}. Me comunico respecto al caso ${caso.nombre}.`} />
              </div>

              {caso.juzgadoTribunal && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">•</span>
                  <span>{caso.juzgadoTribunal}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                <span className="text-slate-400">•</span>
                <span>Iniciado: {formatFecha(caso.fechaCreacion)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-brand-900 bg-white border border-slate-300 rounded-md hover:bg-brand-50 transition-colors"
              >
                Editar caso
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsActionsOpen((open) => !open)}
                  aria-expanded={isActionsOpen}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors"
                >
                  Acciones <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {isActionsOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-sm">
                    {([
                      ['Nueva tarea', () => { setTaskSuccess(''); setIsTaskModalOpen(true); }],
                      ['Registrar actividad', () => setIsActivityModalOpen(true)],
                      ['Agendar evento', () => setIsEventModalOpen(true)],
                      ['Registrar pago', () => { setFinanceSuccess(''); setSelectedPayment(undefined); setIsPaymentModalOpen(true); }],
                      ['Registrar gasto', () => { setFinanceSuccess(''); setSelectedExpense(undefined); setIsExpenseModalOpen(true); }],
                    ] as const).map(([label, openModal]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => { setIsActionsOpen(false); openModal(); }}
                        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-brand-50 focus-visible:bg-brand-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          {/* Resumen económico rápido en cabecera */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row lg:flex-col justify-between gap-2 sm:gap-4 lg:gap-1.5 min-w-[200px]">
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-500">Honorarios:</span>
              <span className="font-bold font-mono text-slate-900">
                {formatBs(caso.honorariosAcordados)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-500">Pendiente del cliente:</span>
              <span
                className={`font-bold font-mono ${
                  caso.totalPendiente > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {formatBs(caso.totalPendiente)}
              </span>
            </div>
          </div>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <div className="flex border-b border-slate-200 mt-6 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange('resumen')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'resumen'
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>RESUMEN</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('actividad')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'actividad'
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>ACTIVIDAD ({caseActivities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('agenda')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>AGENDA ({caseEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('documentos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'documentos' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            <FileText className="w-4 h-4" /><span>DOCUMENTOS ({documentsError ? '—' : documentCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('finanzas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'finanzas'
                ? 'border-brand-900 text-brand-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>FINANZAS</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      {activeTab === 'documentos' && <CaseDocuments key={caso.id} casoId={caso.id} />}

      {/* PESTAÑA 1: RESUMEN DEL CASO */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ficha principal del expediente */}
          <div className="lg:col-span-2 space-y-6">
            {taskSuccess && <p role="status" className="text-sm text-brand-900">{taskSuccess}</p>}
            <TaskSummary casoId={caso.id} onNewTask={() => { setTaskSuccess(''); setIsTaskModalOpen(true); }} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div><h2 className="text-sm font-semibold text-slate-900">Documentos</h2><p className="mt-1 text-xs text-slate-500">{documentsError ? 'No se pudo cargar el recuento' : `${documentCount} ${documentCount === 1 ? 'archivo' : 'archivos'}`}</p></div>
              <button type="button" onClick={() => handleTabChange('documentos')} className="min-h-11 rounded-md px-2 text-sm font-semibold text-brand-900 hover:bg-brand-50">{documentCount ? 'Ver documentos →' : 'Agregar documento →'}</button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-900" />
                <span>Ficha Principal del Expediente</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Cliente
                  </span>
                  <Link
                    to={`/clientes/${caso.clienteId}`}
                    className="font-bold text-sm text-brand-900 hover:underline"
                  >
                    {caso.clienteNombre}
                  </Link>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Rol del cliente
                  </span>
                  <span className="font-semibold text-sm text-slate-900">
                    {caso.participacion}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Área
                  </span>
                  <AreaBadge area={caso.area} />
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Estado
                  </span>
                  <StatusBadge status={caso.estado} />
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Identificación Judicial
                  </span>
                  <JudicialIdBadge
                    tipo={caso.tipoIdentificacionJudicial}
                    numero={caso.numeroIdentificacionJudicial}
                  />
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Juzgado / Tribunal
                  </span>
                  <span className="font-medium text-slate-800">
                    {caso.juzgadoTribunal || 'No radicado o no especificado'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-1 text-xs">
                  Notas o resumen
                </span>
                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line">
                  {caso.descripcion}
                </p>
              </div>
            </div>
          </div>

          {/* Columna Lateral del Resumen: Próximo Evento & Resumen Financiero */}
          <div className="space-y-6">
            {/* Próximo Evento */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-900" />
                  Próximo Evento
                </span>
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(true)}
                  className="text-xs text-brand-900 hover:underline font-semibold"
                >
                  + Agendar
                </button>
              </div>

              {caso.proximoEvento ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                      {caso.proximoEvento.tipo}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-700">
                      {formatFecha(caso.proximoEvento.fecha)}
                      {caso.proximoEvento.hora && ` · ${formatHora(caso.proximoEvento.hora)}`}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-900">
                    {caso.proximoEvento.titulo}
                  </h4>

                  {caso.proximoEvento.descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {caso.proximoEvento.descripcion}
                    </p>
                  )}

                  <button
                    onClick={() => handleTabChange('agenda')}
                    className="text-xs font-semibold text-brand-900 hover:underline mt-2 inline-block"
                  >
                    Ver en agenda del caso →
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  No hay señalamientos pendientes para este caso.
                </p>
              )}
            </div>

            {/* Resumen Financiero Básico */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-brand-900" />
                  Resumen Financiero
                </span>
                <button
                  onClick={() => handleTabChange('finanzas')}
                  className="text-xs text-brand-900 hover:underline font-semibold"
                >
                  Ver detalle →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Honorarios acordados:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatBs(caso.honorariosAcordados)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Total pagado por cliente:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatBs(caso.totalPagado)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Pendiente del cliente:</span>
                  <span
                    className={`font-mono font-bold ${
                      caso.totalPendiente > 0 ? 'text-amber-800' : 'text-slate-600'
                    }`}
                  >
                    {formatBs(caso.totalPendiente)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Gastos operativos caso:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {formatBs(caso.totalGastos)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ACTIVIDAD (Línea de tiempo) */}
      {activeTab === 'actividad' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Historial de Actuaciones Procesales
              </h2>
              <p className="text-xs text-slate-500">
                Línea de tiempo cronológica de memoriales, notificaciones y reuniones
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsActivityModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Actividad</span>
            </button>
          </div>

          <ActivityTimeline
            activities={caseActivities}
            onAddClick={() => setIsActivityModalOpen(true)}
          />
        </div>
      )}

      {/* PESTAÑA 3: AGENDA DEL CASO */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Agenda Específica del Caso
              </h2>
              <p className="text-xs text-slate-500">
                Audiencias, plazos, reuniones y actuados registrados
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEventModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Evento</span>
            </button>
          </div>

          {caseEvents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">No hay eventos en la agenda de este caso.</p>
              <button
                type="button"
                onClick={() => setIsEventModalOpen(true)}
                className="mt-3 text-xs font-semibold text-brand-900 hover:underline"
              >
                Programar primera audiencia o plazo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {caseEvents.map((ev) => (
                <div
                  key={ev.id}
                  id={`evento-${ev.id}`}
                  className={`bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors ${highlightedEventId === ev.id ? 'ring-2 ring-brand-200 bg-brand-50/40' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ev.tipo}
                      </span>
                      {ev.alertaVisual && <AlertBadge alerta={ev.alertaVisual} />}
                      <EventResultStatus event={ev} />
                    </div>

                    <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatFecha(ev.fecha)}</span>
                      {ev.hora && <span>· {formatHora(ev.hora)}</span>}
                    </div>
                      <EventMenu evento={ev} onEdit={() => setEditingCalendarEvent(ev)} />
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{ev.titulo}</h3>
                  <EventResultAction event={ev} />

                  {ev.juzgado && (
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>Juzgado:</strong> {ev.juzgado}
                    </p>
                  )}

                  {ev.descripcion && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      {ev.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: FINANZAS DEL CASO */}
      {activeTab === 'finanzas' && (
        <div className="space-y-6">
          {financeSuccess && (
            <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
              {financeSuccess}
            </div>
          )}
          {financeError && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{financeError}</div>}
          {/* Bloque 1: Honorarios del Caso (Honorarios acordados, Pagado, Saldo pendiente) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-900" />
                  <span>Control de Honorarios Profesionales</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seguimiento de honorarios pactados y cobranzas realizadas
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setFinanceSuccess(''); setSelectedPayment(undefined); setIsPaymentModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-900 rounded-md transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Pago</span>
              </button>
            </div>

            {/* Tres datos solicitados en la consigna */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                  Honorarios Acordados
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatBs(caso.honorariosAcordados)}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block mb-1">
                  Total Pagado
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-emerald-900">
                  {formatBs(caso.totalPagado)}
                </span>
              </div>

              <div className={`p-4 rounded-lg border ${caso.saldoPendiente === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className={`text-[11px] uppercase tracking-wider font-semibold block mb-1 ${caso.saldoPendiente === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {caso.saldoPendiente === 0 ? '✓ Honorarios pagados' : 'Honorarios pendientes'}
                </span>
                <span className={`${caso.saldoPendiente === 0 ? 'text-sm text-emerald-900' : 'text-xl text-amber-950'} font-bold font-mono tabular-nums`}>
                  {caso.saldoPendiente === 0 ? 'Sin saldo pendiente' : formatBs(caso.saldoPendiente)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-brand-100 bg-brand-50/40 px-4 py-3 text-xs">
              <span className="text-slate-700">Honorarios pendientes: <strong>{formatBs(caso.saldoPendiente)}</strong> · Gastos pendientes: <strong>{formatBs(caso.gastosPendientes)}</strong></span>
              <span className="font-bold text-brand-900">Total pendiente del cliente: {formatBs(caso.totalPendiente)}</span>
            </div>

            {/* Historial de Pagos Parciales */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Historial de Pagos Parciales Registrados
              </h4>

              {casePayments.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  No hay pagos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="mobile-data-table w-full md:min-w-[480px] text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Fecha</th>
                        <th className="px-4 py-2.5">Concepto / Nota</th>
                        <th className="px-4 py-2.5 text-right">Monto</th>
                        <th className="px-2 py-2.5 text-right" aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {casePayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                            {formatFecha(p.fecha)}
                          </td>
                          <td data-label="Concepto" className="px-4 py-3 text-slate-800">
                            {p.nota || 'Pago a cuenta de honorarios'}
                          </td>
                          <td data-label="Monto" className="px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap text-emerald-800">
                            {formatBs(p.monto)}
                          </td>
                          <td data-label="Acciones" className="px-2 py-2 text-right">
                            <FinancialRowActions label={`pago de ${formatBs(p.monto)}`}
                              onEdit={() => { setSelectedPayment(p); setIsPaymentModalOpen(true); setFinanceSuccess(''); }}
                              onDelete={() => { setPendingDelete({ type: 'pago', id: p.id, monto: p.monto }); setFinanceError(''); }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Gastos Operativos del Caso (SEPARADOS DE LOS PAGOS) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Gastos Operativos del Caso
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fotocopias, aranceles, notarías y viáticos (separados de honorarios)
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => { setFinanceSuccess(''); setSelectedExpense(undefined); setIsExpenseModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-900 rounded-md transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Gasto</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <span>Gastos registrados: <strong className="font-mono">{formatBs(caso.totalGastos)}</strong></span>
              <span>Reembolsables: <strong className="font-mono">{formatBs(caso.gastosReembolsables)}</strong></span>
              <span>Reembolsados: <strong className="font-mono">{formatBs(caso.totalReembolsado)}</strong></span>
              <span className={caso.gastosPendientes > 0 ? 'text-amber-800' : 'text-emerald-800'}>
                {caso.gastosPendientes > 0
                  ? <>Pendientes de reembolso: <strong className="font-mono">{formatBs(caso.gastosPendientes)}</strong></>
                  : <strong>✓ {caso.gastosReembolsables > 0 ? 'Gastos reembolsados' : 'Sin gastos pendientes de reembolso'}</strong>}
              </span>
              {caso.gastosPendientes > 0 && <button type="button" onClick={() => { setSelectedReimbursement(undefined); setIsReimbursementModalOpen(true); setFinanceSuccess(''); }}
                className="rounded-md border border-brand-300 bg-white px-3 py-1.5 font-semibold text-brand-900 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-900">
                Registrar reembolso
              </button>}
            </div>

            {caseExpenses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                No hay gastos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="mobile-data-table w-full md:min-w-[580px] text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Fecha</th>
                      <th className="px-4 py-2.5">Concepto</th>
                      <th className="px-4 py-2.5">Justificante / Nota</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                      <th className="px-2 py-2.5 text-right" aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {caseExpenses.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatFecha(g.fecha)}
                        </td>
                        <td data-label="Concepto" className="px-4 py-3 font-semibold text-slate-900">
                          <div className="min-w-0">
                            {g.concepto}
                            <span className="block text-[10px] font-normal text-slate-500">{g.reembolsable === true ? 'Reembolsable' : 'No reembolsable'}</span>
                          </div>
                        </td>
                        <td data-label="Nota" className="px-4 py-3 text-slate-500">
                          {g.nota || '-'}
                        </td>
                        <td data-label="Monto" className="px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap text-slate-800">
                          {formatBs(g.monto)}
                        </td>
                        <td data-label="Acciones" className="px-2 py-2 text-right">
                          <FinancialRowActions label={`gasto de ${formatBs(g.monto)}`}
                            onEdit={() => { setSelectedExpense(g); setIsExpenseModalOpen(true); setFinanceSuccess(''); }}
                            onDelete={() => { setPendingDelete({ type: 'gasto', id: g.id, monto: g.monto }); setFinanceError(''); }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {caseReimbursements.length > 0 && <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Reembolsos recibidos</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="mobile-data-table w-full md:min-w-[450px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase"><tr>
                    <th className="px-4 py-2.5">Fecha</th><th className="px-4 py-2.5">Nota</th><th className="px-4 py-2.5 text-right">Monto</th><th className="px-2 py-2.5" aria-label="Acciones" />
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{caseReimbursements.map((r) => <tr key={r.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                    <td data-label="Nota" className="px-4 py-3">{r.nota || 'Reembolso de gastos'}</td>
                    <td data-label="Monto" className="px-4 py-3 text-right font-mono font-bold text-emerald-800">{formatBs(r.monto)}</td>
                    <td data-label="Acciones" className="px-2 py-2 text-right"><FinancialRowActions label={`reembolso de ${formatBs(r.monto)}`}
                      onEdit={() => { setSelectedReimbursement(r); setIsReimbursementModalOpen(true); setFinanceSuccess(''); }}
                      onDelete={() => { setPendingDelete({ type: 'reembolso', id: r.id, monto: r.monto }); setFinanceError(''); }} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>}
          </div>
        </div>
      )}

      {/* Modales de Gestión de este caso */}
      {isTaskModalOpen && <TaskFormModal casoId={caso.id} onClose={() => setIsTaskModalOpen(false)} onSuccess={() => setTaskSuccess('Tarea creada correctamente.')} />}
      {isEditModalOpen && (
        <CaseFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          caso={caso}
        />
      )}
      <ActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        casoId={caso.id}
      />
      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        preselectedCasoId={caso.id}
      />
      {editingCalendarEvent && <EventFormModal isOpen evento={editingCalendarEvent} preselectedCasoId={caso.id} onClose={() => setEditingCalendarEvent(null)} />}
      {isPaymentModalOpen && <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        casoId={caso.id}
        saldoPendiente={caso.saldoPendiente}
        pago={selectedPayment}
        onSuccess={() => { setFinanceSuccess(selectedPayment ? 'Pago actualizado correctamente.' : 'Pago registrado correctamente.'); setSearchParams({ tab: 'finanzas' }); }}
      />}
      {isExpenseModalOpen && <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        casoId={caso.id}
        gasto={selectedExpense}
        onSuccess={() => { setFinanceSuccess(selectedExpense ? 'Gasto actualizado correctamente.' : 'Gasto registrado correctamente.'); setSearchParams({ tab: 'finanzas' }); }}
      />}
      {isReimbursementModalOpen && <ReimbursementFormModal
        casoId={caso.id}
        reembolso={selectedReimbursement}
        onClose={() => setIsReimbursementModalOpen(false)}
        onSuccess={() => setFinanceSuccess(selectedReimbursement ? 'Reembolso actualizado correctamente.' : 'Reembolso registrado correctamente.')}
      />}
      {pendingDelete && <Modal isOpen title={`Eliminar ${pendingDelete.type}`} onClose={() => { if (!deletingRef.current) { setPendingDelete(null); setFinanceError(''); } }} maxWidth="sm">
        <div className="space-y-4 text-sm text-slate-700">
          <p>¿Eliminar este {pendingDelete.type} de <strong>{formatBs(pendingDelete.monto)}</strong>?</p>
          <p>Los totales del caso se recalcularán automáticamente.</p>
          {financeError && <p role="alert" className="rounded-md bg-rose-50 p-2 text-rose-800">{financeError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={deleting} onClick={() => { setPendingDelete(null); setFinanceError(''); }} className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50">Cancelar</button>
            <button type="button" disabled={deleting} onClick={confirmDelete} className="rounded-md bg-rose-700 px-4 py-2 font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
              {deleting ? 'Eliminando...' : `Eliminar ${pendingDelete.type}`}
            </button>
          </div>
        </div>
      </Modal>}
    </div>
  );
};
