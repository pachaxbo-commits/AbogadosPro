import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { StatusBadge, AreaBadge, JudicialIdBadge } from '../components/common/StatusBadge';
import { ActivityTimeline } from '../components/activities/ActivityTimeline';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { EventFormModal } from '../components/events/EventFormModal';
import { PaymentFormModal } from '../components/finances/PaymentFormModal';
import { ExpenseFormModal } from '../components/finances/ExpenseFormModal';
import { formatBs, formatFecha, formatHora } from '../services/formatters';
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
} from 'lucide-react';

type TabType = 'resumen' | 'actividad' | 'agenda' | 'finanzas';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getCaseWithDetails,
    activities,
    payments,
    expenses,
    eventsWithCase,
  } = useLegalData();

  const tabParam = searchParams.get('tab') as TabType;
  const activeTab: TabType = ['resumen', 'actividad', 'agenda', 'finanzas'].includes(tabParam)
    ? tabParam
    : 'resumen';

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Modales
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

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

  // Eventos del caso (ordenados cronológicamente más próximos primero)
  const caseEvents = eventsWithCase.filter((e) => e.casoId === caso.id);

  // Pagos y Gastos
  const casePayments = payments
    .filter((p) => p.casoId === caso.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const caseExpenses = expenses
    .filter((g) => g.casoId === caso.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <div className="flex items-center justify-between">
        <Link
          to="/casos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la lista de Expedientes</span>
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

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Cliente:</span>
                <Link
                  to={`/clientes/${caso.clienteId}`}
                  className="font-semibold text-brand-900 hover:underline"
                >
                  {caso.clienteNombre}
                </Link>
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

          {/* Resumen económico rápido en cabecera */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex lg:flex-col justify-between gap-4 lg:gap-1.5 min-w-[200px]">
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-500">Honorarios:</span>
              <span className="font-bold font-mono text-slate-900">
                {formatBs(caso.honorariosAcordados)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-slate-500">Saldo pendiente:</span>
              <span
                className={`font-bold font-mono ${
                  caso.saldoPendiente > 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {formatBs(caso.saldoPendiente)}
              </span>
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

      {/* PESTAÑA 1: RESUMEN DEL CASO */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ficha principal del expediente */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-900" />
                <span>Ficha Principal del Expediente</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Cliente Patrocinado
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
                    Participación Procesal
                  </span>
                  <span className="font-semibold text-sm text-slate-900">
                    {caso.participacion}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Área del Derecho
                  </span>
                  <AreaBadge area={caso.area} />
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    Estado Actual
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
                    Juzgado o Tribunal
                  </span>
                  <span className="font-medium text-slate-800">
                    {caso.juzgadoTribunal || 'No radicado o no especificado'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-1 text-xs">
                  Descripción y Objeto de la Causa
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
                  <span className="text-slate-500">Saldo pendiente:</span>
                  <span
                    className={`font-mono font-bold ${
                      caso.saldoPendiente > 0 ? 'text-amber-800' : 'text-slate-600'
                    }`}
                  >
                    {formatBs(caso.saldoPendiente)}
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
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ev.tipo}
                      </span>
                      {ev.alertaVisual && <AlertBadge alerta={ev.alertaVisual} />}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatFecha(ev.fecha)}</span>
                      {ev.hora && <span>· {formatHora(ev.hora)}</span>}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{ev.titulo}</h3>

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
          {/* Bloque 1: Honorarios del Caso (Honorarios acordados, Pagado, Saldo pendiente) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
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
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Pago</span>
              </button>
            </div>

            {/* Tres datos solicitados en la consigna */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 block mb-1">
                  Honorarios Acordados
                </span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {formatBs(caso.honorariosAcordados)}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block mb-1">
                  Total Pagado
                </span>
                <span className="text-xl font-bold font-mono text-emerald-900">
                  {formatBs(caso.totalPagado)}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-800 block mb-1">
                  Saldo Pendiente
                </span>
                <span className="text-xl font-bold font-mono text-amber-950">
                  {formatBs(caso.saldoPendiente)}
                </span>
              </div>
            </div>

            {/* Historial de Pagos Parciales */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Historial de Pagos Parciales Registrados
              </h4>

              {casePayments.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  No se han registrado pagos para este caso todavía.
                </div>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Fecha</th>
                        <th className="px-4 py-2.5">Concepto / Nota</th>
                        <th className="px-4 py-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {casePayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {formatFecha(p.fecha)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {p.nota || 'Pago a cuenta de honorarios'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                            {formatBs(p.monto)}
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
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Total Gastos
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-800">
                    {formatBs(caso.totalGastos)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Gasto</span>
                </button>
              </div>
            </div>

            {caseExpenses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                No hay gastos operativos registrados para este caso.
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Fecha</th>
                      <th className="px-4 py-2.5">Concepto</th>
                      <th className="px-4 py-2.5">Justificante / Nota</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {caseExpenses.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {formatFecha(g.fecha)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {g.concepto}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {g.nota || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                          {formatBs(g.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales de Gestión de este caso */}
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
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        casoId={caso.id}
        saldoPendiente={caso.saldoPendiente}
      />
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        casoId={caso.id}
      />
    </div>
  );
};
