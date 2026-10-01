import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { EventCard } from '../components/events/EventCard';
import { EventFormModal } from '../components/events/EventFormModal';
import { ActivityFormModal } from '../components/activities/ActivityFormModal';
import { Evento } from '../types';
import { getTodayIsoString } from '../services/formatters';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Scale,
  Users,
  AlertCircle,
} from 'lucide-react';

type FilterType = 'todos' | 'hoy' | 'proximos' | 'audiencias' | 'plazos' | 'reuniones';
type DateFilter = 'sin_filtro' | 'hoy' | 'semana' | 'mes' | 'rango';

export const AgendaPage: React.FC = () => {
  const { events, eventsWithCase, updateEvent } = useLegalData();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterType>(() => {
    const requestedFilter = searchParams.get('filtro');
    return requestedFilter === 'audiencias' || requestedFilter === 'plazos' ? requestedFilter : 'proximos';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [activityCasoId, setActivityCasoId] = useState<string | null>(null);
  const [completedCasoId, setCompletedCasoId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('sin_filtro');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const hoyStr = getTodayIsoString();
  const today = new Date(`${hoyStr}T00:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  const handleComplete = async (id: string) => {
    const existing = events.find((event) => event.id === id);
    if (!existing) return;
    const { id: _id, ...data } = existing;
    await updateEvent(id, { ...data, realizado: true });
    setCompletedCasoId(existing.casoId);
  };

  const filteredEvents = useMemo(() => {
    return eventsWithCase.filter((ev) => {
      const matchesDate = dateFilter === 'sin_filtro' ||
        (dateFilter === 'hoy' && ev.fecha === hoyStr) ||
        (dateFilter === 'semana' && ev.fecha >= weekStart && ev.fecha <= weekEnd) ||
        (dateFilter === 'mes' && ev.fecha.startsWith(hoyStr.slice(0, 7))) ||
        (dateFilter === 'rango' && (!dateFrom || ev.fecha >= dateFrom) && (!dateTo || ev.fecha <= dateTo));
      if (!matchesDate) return false;
      switch (filter) {
        case 'hoy':
          return ev.fecha === hoyStr;
        case 'proximos':
          return ev.fecha >= hoyStr && !ev.realizado;
        case 'audiencias':
          return ev.tipo === 'Audiencia';
        case 'plazos':
          return ev.tipo === 'Plazo';
        case 'reuniones':
          return ev.tipo === 'Reunión';
        case 'todos':
        default:
          return true;
      }
    });
  }, [eventsWithCase, filter, hoyStr, weekStart, weekEnd, dateFilter, dateFrom, dateTo]);

  const countHoy = eventsWithCase.filter((e) => e.fecha === hoyStr).length;
  const countAudiencias = eventsWithCase.filter((e) => e.tipo === 'Audiencia' && e.fecha >= hoyStr).length;
  const countPlazos = eventsWithCase.filter((e) => e.tipo === 'Plazo' && e.fecha >= hoyStr).length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agenda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Señalamientos, audiencias y plazos procesales consolidados de todos los casos
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Evento</span>
        </button>
      </div>

      {/* Pestañas de Filtro Rápido */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setFilter('proximos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'proximos'
              ? 'bg-brand-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Próximos</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('hoy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'hoy'
              ? 'bg-rose-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Hoy ({countHoy})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('audiencias')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'audiencias'
              ? 'bg-brand-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Audiencias ({countAudiencias})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('plazos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'plazos'
              ? 'bg-brand-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Plazos ({countPlazos})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('reuniones')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'reuniones'
              ? 'bg-brand-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Reuniones</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('todos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            filter === 'todos'
              ? 'bg-brand-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Todos los eventos ({eventsWithCase.length})</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
        <label htmlFor="agenda-fecha" className="text-xs font-semibold text-slate-600 px-1">Fecha:</label>
        <select
          id="agenda-fecha"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900"
        >
          <option value="sin_filtro">Todas las fechas</option>
          <option value="hoy">Hoy</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mes</option>
          <option value="rango">Rango personalizado</option>
        </select>
        {dateFilter === 'rango' && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <label htmlFor="agenda-desde">Desde</label>
            <input id="agenda-desde" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-md" />
            <label htmlFor="agenda-hasta">Hasta</label>
            <input id="agenda-hasta" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-md" />
          </div>
        )}
      </div>

      {completedCasoId && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg">
          <span>Evento marcado como realizado.</span>
          <button type="button" onClick={() => { setActivityCasoId(completedCasoId); setCompletedCasoId(null); }} className="font-semibold text-brand-900 hover:underline">
            Registrar actividad del caso →
          </button>
          <button type="button" onClick={() => setCompletedCasoId(null)} className="ml-auto text-slate-500 hover:text-slate-700" aria-label="Cerrar aviso">×</button>
        </div>
      )}

      {/* Lista Cronológica de Eventos */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg border border-dashed border-slate-200">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">
              No hay eventos para el filtro seleccionado
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Prueba cambiando a "Todos" o programa un nuevo evento.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-900 rounded-md hover:bg-brand-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Programar Evento</span>
            </button>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <EventCard
              key={ev.id}
              evento={ev}
              showCaseLink={true}
              onEdit={() => setEditingEvent(events.find((event) => event.id === ev.id) || null)}
              onComplete={() => void handleComplete(ev.id)}
            />
          ))
        )}
      </div>

      {/* Modal Agendar Evento */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      {editingEvent && (
        <EventFormModal
          isOpen
          onClose={() => setEditingEvent(null)}
          evento={editingEvent}
        />
      )}
      {activityCasoId && (
        <ActivityFormModal
          isOpen
          onClose={() => setActivityCasoId(null)}
          casoId={activityCasoId}
        />
      )}
    </div>
  );
};
