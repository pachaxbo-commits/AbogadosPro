import { eventState } from '../services/eventResults';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { useProfile } from '../context/ProfileContext';
import { useTaskClock } from '../hooks/useTaskClock';
import { caseFollowUp } from '../services/caseFollowUp';
import { formatFecha } from '../services/formatters';
import { FollowUpRegistrationModal } from '../components/cases/CaseFollowUp';
import { StatCard } from '../components/common/StatCard';
import { PageHeroHeader } from '../components/common/PageHeroHeader';
import { EventCard } from '../components/events/EventCard';
import { financialDate } from '../services/finance';
import { formatBs } from '../services/formatters';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { EventFormModal } from '../components/events/EventFormModal';
import { TaskSummary } from '../components/tasks/TaskSummary';
import {
  Briefcase,
  Scale,
  Clock,
  Wallet,
  Calendar,
  Plus,
  ArrowRight,
  UserPlus,
  FilePlus,
  History,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignees } = useProfile();
  const now = useTaskClock();
  const {
    cases,
    clients,
    documents,
    tasks,
    events,
    eventsWithCase,
    activities,
    payments,
    financialTotals,
  } = useLegalData();

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const overdueCases = useMemo(() => cases.map(caso => ({ caso, review: caseFollowUp(caso, activities, documents, tasks, events, now) }))
    .filter(item => item.review.state === 'requiere')
    .sort((a, b) => b.review.overdueDays - a.review.overdueDays), [cases, activities, documents, tasks, events, now]);
  const clientNames = useMemo(() => new Map(clients.map(client => [client.id, client.nombre])), [clients]);
  const assigneeNames = useMemo(() => new Map(assignees.map(assignee => [assignee.id, assignee.nombre])), [assignees]);

  // Métricas
  const activeCasesCount = cases.filter(
    (c) => c.estado === 'Activo' || c.estado === 'En trámite'
  ).length;

  const hoyStr = new Date().toISOString().split('T')[0];

  const upcomingAudiencias = eventsWithCase.filter(
    (e) => e.tipo === 'Audiencia' && e.fecha >= hoyStr && eventState(e) === 'Próximo'
  ).length;

  const upcomingPlazos = eventsWithCase.filter(
    (e) => e.tipo === 'Plazo' && e.fecha >= hoyStr && eventState(e) === 'Próximo'
  ).length;

  // Próximos eventos (ordenados, futuros o de hoy)
  const proximosEventos = eventsWithCase
    .filter((e) => e.fecha >= hoyStr && eventState(e) === 'Próximo')
    .slice(0, 4);

  // Movimientos recientes (combinar actividades y pagos ordenados por fecha)
  const caseMap = new Map(cases.map((c) => [c.id, c]));

  const recientes = [
    ...activities.map((a) => ({
      id: a.id,
      tipo: 'actividad' as const,
      subtipo: a.tipo,
      titulo: a.titulo,
      fecha: a.fecha,
      hora: a.hora,
      casoId: a.casoId,
      casoNombre: caseMap.get(a.casoId)?.nombre || 'Caso',
      casoArea: caseMap.get(a.casoId)?.area || 'Civil',
    })),
    ...payments.map((p) => ({
      id: p.id,
      tipo: 'pago' as const,
      subtipo: 'Pago de honorarios',
      titulo: `Abono de ${formatBs(p.monto)}${p.nota ? ` - ${p.nota}` : ''}`,
      fecha: p.fecha,
      hora: p.hora,
      casoId: p.casoId,
      casoNombre: caseMap.get(p.casoId)?.nombre || 'Caso',
      casoArea: caseMap.get(p.casoId)?.area || 'Civil',
    })),
  ]
    .sort((a, b) => {
      const dtA = `${a.fecha}T${a.hora || '00:00'}`;
      const dtB = `${b.fecha}T${b.hora || '00:00'}`;
      return dtB.localeCompare(dtA);
    })
    .slice(0, 5);

  return (
    <div className="space-y-7">
      {/* Encabezado y Accesos Rápidos */}
      <PageHeroHeader title="Panel de Control Jurídico" subtitle="Tu agenda y la actividad reciente del despacho" actions={<>
          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/70 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCaseModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-400 bg-amber-400 px-4 py-2.5 text-sm font-bold text-brand-950 transition-colors hover:bg-amber-300"
          >
            <FilePlus className="w-4 h-4" />
            <span>Nuevo caso</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEventModalOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/70 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar evento</span>
          </button>
      </>} />

      {/* Tarjetas Principales de Métricas */}
      <div>
        <div className="mb-3 flex items-center gap-3"><span className="h-4 w-0.5 rounded-full bg-amber-400" aria-hidden="true" /><h2 className="text-sm font-semibold text-brand-900">Resumen del estudio</h2></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Casos activos"
          compact
          className="rounded-xl border-t-2 border-t-amber-300 shadow-sm"
          to="/casos?estado=activos"
          value={activeCasesCount}
          icon={<Briefcase className="w-5 h-5 text-brand-900" />}
        />
        <StatCard
          title="Audiencias"
          compact
          className="rounded-xl border-t-2 border-t-amber-300 shadow-sm"
          to="/agenda?filtro=audiencias"
          value={upcomingAudiencias}
          icon={<Scale className="w-5 h-5 text-brand-900" />}
        />
        <StatCard
          title="Plazos"
          compact
          className="rounded-xl border-t-2 border-t-amber-300 shadow-sm"
          to="/agenda?filtro=plazos"
          value={upcomingPlazos}
          icon={<Clock className="w-5 h-5 text-brand-900" />}
        />
        <StatCard
          title="Por cobrar"
          compact
          className="rounded-xl border-t-2 border-t-amber-300 shadow-sm"
          to="/finanzas#saldos-pendientes"
          value={formatBs(financialTotals.totalPendienteClientes)}
          icon={<Wallet className="w-5 h-5 text-brand-900" />}
        />
        </div>
      </div>

      <section aria-labelledby="overdue-cases-title">
        <div className="mb-3 flex items-center gap-3"><span className="h-4 w-0.5 rounded-full bg-amber-400" aria-hidden="true" /><h2 id="overdue-cases-title" className="text-sm font-semibold text-brand-900">Casos que requieren atención</h2></div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs">
          {overdueCases.length === 0 ? <p className="px-5 py-4 text-sm text-slate-600">No hay casos pendientes de seguimiento.</p> : overdueCases.map(({ caso, review }) => <div key={caso.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{caso.nombre}</p>
              <p className="mt-0.5 text-xs text-slate-600">{clientNames.get(caso.clienteId) || 'Cliente no disponible'} · Encargado: {caso.encargadoId ? assigneeNames.get(caso.encargadoId) || 'No disponible' : 'Sin encargado'}</p>
              <p className="mt-1 text-xs text-slate-500">Último movimiento: {review.lastMovement ? `${formatFecha(review.lastMovement.fecha)} · ${review.lastMovement.descripcion}` : `Sin movimientos · desde ${formatFecha(caso.fechaCreacion)}`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{review.overdueDays} {review.overdueDays === 1 ? 'día' : 'días'} de retraso</span>
              <Link to={`/casos/${caso.id}`} className="rounded-md px-2 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50">Ver caso →</Link>
              <button type="button" onClick={() => setSelectedFollowUpId(caso.id)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50">Registrar seguimiento</button>
            </div>
          </div>)}
        </div>
      </section>

      {/* Grid: Próximos Eventos vs Actividades Recientes */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
        {/* Columna Izquierda / Central: Próximos Eventos y Alertas Visuales (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-900 text-amber-300"><Calendar className="h-5 w-5" /></span>
              <h2 className="font-serif text-xl font-bold text-brand-900">Próximos eventos</h2>
            </div>
            <Link
              to="/agenda"
              className="min-h-11 text-sm font-semibold text-brand-900 hover:text-brand-700 flex items-center gap-1 hover:underline"
            >
              <span>Ver agenda completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {proximosEventos.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-lg text-xs text-slate-500">
                No hay eventos futuros programados.
              </div>
            ) : (
              proximosEventos.map((ev) => (
                <EventCard key={ev.id} evento={ev} showCaseLink={true} summary />
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Movimientos y Actividades Recientes (1 col) */}
        <div className="space-y-5">
          <TaskSummary />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-brand-900" />
              <h2 className="font-serif text-lg font-bold text-brand-900">Actividad reciente</h2>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs">
            {recientes.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-50/80 transition-colors">
                <p className="text-sm font-semibold text-slate-800">{item.subtipo}</p>
                <p className="mt-1 text-sm text-slate-600 break-words">{item.casoNombre}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{financialDate(item)}</span>
                  <Link
                    to={`/casos/${item.casoId}`}
                    className="min-h-11 inline-flex items-center gap-1 px-2 text-sm font-semibold text-brand-900 hover:text-brand-700 hover:underline"
                  >
                    <span>Ver caso →</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modales */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(clientId) => navigate(`/clientes/${clientId}`)}
      />
      <CaseFormModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
      />
      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
      />
      {selectedFollowUpId && <FollowUpRegistrationModal casoId={selectedFollowUpId} onClose={() => setSelectedFollowUpId(null)} />}
    </div>
  );
};
