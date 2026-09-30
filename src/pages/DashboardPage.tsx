import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatCard } from '../components/common/StatCard';
import { EventCard } from '../components/events/EventCard';
import { formatBs, formatFecha } from '../services/formatters';
import { ClientFormModal } from '../components/clients/ClientFormModal';
import { CaseFormModal } from '../components/cases/CaseFormModal';
import { EventFormModal } from '../components/events/EventFormModal';
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
  const {
    cases,
    eventsWithCase,
    activities,
    payments,
    financialTotals,
  } = useLegalData();

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Métricas
  const activeCasesCount = cases.filter(
    (c) => c.estado === 'Activo' || c.estado === 'En trámite'
  ).length;

  const hoyStr = new Date().toISOString().split('T')[0];

  const upcomingAudiencias = eventsWithCase.filter(
    (e) => e.tipo === 'Audiencia' && e.fecha >= hoyStr
  ).length;

  const upcomingPlazos = eventsWithCase.filter(
    (e) => e.tipo === 'Plazo' && e.fecha >= hoyStr
  ).length;

  // Próximos eventos (ordenados, futuros o de hoy)
  const proximosEventos = eventsWithCase
    .filter((e) => e.fecha >= hoyStr)
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
      hora: undefined,
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
    <div className="space-y-6">
      {/* Encabezado y Accesos Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Panel de Control Jurídico
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Resumen operativo y agenda procesal del despacho
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsClientModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Nuevo Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Nuevo Caso</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEventModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agendar Evento</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Principales de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Casos Activos"
          value={activeCasesCount}
          subtitle={`De un total de ${cases.length} expedientes`}
          icon={<Briefcase className="w-5 h-5 text-brand-900" />}
        />
        <StatCard
          title="Próximas Audiencias"
          value={upcomingAudiencias}
          subtitle="En señalamiento judicial"
          icon={<Scale className="w-5 h-5 text-rose-700" />}
          badge={upcomingAudiencias > 0 ? 'Atención' : undefined}
          badgeType="warning"
        />
        <StatCard
          title="Próximos Plazos"
          value={upcomingPlazos}
          subtitle="Términos procesales por vencer"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          badge={upcomingPlazos > 0 ? 'Prioritario' : undefined}
          badgeType="warning"
        />
        <StatCard
          title="Saldo Pendiente Total"
          value={formatBs(financialTotals.saldoPendiente)}
          subtitle={`Cobrado: ${formatBs(financialTotals.totalCobrado)}`}
          icon={<Wallet className="w-5 h-5 text-emerald-700" />}
        />
      </div>

      {/* Grid: Próximos Eventos vs Actividades Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda / Central: Próximos Eventos y Alertas Visuales (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-900" />
              <h2 className="text-base font-bold text-slate-900">PRÓXIMOS EVENTOS</h2>
            </div>
            <Link
              to="/agenda"
              className="text-xs font-semibold text-brand-900 hover:text-brand-700 flex items-center gap-1 hover:underline"
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
                <EventCard key={ev.id} evento={ev} showCaseLink={true} />
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Movimientos y Actividades Recientes (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-brand-900" />
              <h2 className="text-base font-bold text-slate-900">MOVIMIENTOS RECIENTES</h2>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {recientes.map((item) => (
              <div key={item.id} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-brand-900 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {item.subtipo}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatFecha(item.fecha)}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                  {item.titulo}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 truncate max-w-[170px]">
                    {item.casoNombre}
                  </span>
                  <Link
                    to={`/casos/${item.casoId}`}
                    className="font-medium text-brand-900 hover:text-brand-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>Expediente</span>
                    <ArrowRight className="w-3 h-3" />
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
      />
      <CaseFormModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
      />
      <EventFormModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
      />
    </div>
  );
};
