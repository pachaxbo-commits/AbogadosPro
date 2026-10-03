import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLegalData } from '../context/LegalDataContext';
import { useProfile } from '../context/ProfileContext';
import { EventCard } from '../components/events/EventCard';
import { EventFormModal } from '../components/events/EventFormModal';
import { Evento } from '../types';
import { taskToday } from '../services/tasks';
import { eventState, eventHasPassed, pendingEventResult } from '../services/eventResults';
import { useTaskClock } from '../hooks/useTaskClock';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Scale,
  Users,
  AlertCircle,
} from 'lucide-react';

type FilterType = 'todos' | 'hoy' | 'proximos' | 'audiencias' | 'plazos' | 'reuniones' | 'resultados';
type DateFilter = 'sin_filtro' | 'hoy' | 'semana' | 'mes' | 'rango';

export const AgendaPage: React.FC = () => {
  const { events, eventsWithCase } = useLegalData();
  const { assignees } = useProfile();
  const now = useTaskClock();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterType>(() => {
    const requestedFilter = searchParams.get('filtro');
    return requestedFilter === 'audiencias' || requestedFilter === 'plazos' ? requestedFilter : 'proximos';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('sin_filtro');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [encargadoId, setEncargadoId] = useState('');

  const hoyStr = taskToday(now);
  const today = new Date(`${hoyStr}T00:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  const filteredEvents = useMemo(() => {
    return eventsWithCase.filter((ev) => {
      const matchesDate = dateFilter === 'sin_filtro' ||
        (dateFilter === 'hoy' && ev.fecha === hoyStr) ||
        (dateFilter === 'semana' && ev.fecha >= weekStart && ev.fecha <= weekEnd) ||
        (dateFilter === 'mes' && ev.fecha.startsWith(hoyStr.slice(0, 7))) ||
        (dateFilter === 'rango' && (!dateFrom || ev.fecha >= dateFrom) && (!dateTo || ev.fecha <= dateTo));
      if (!matchesDate) return false;
      if (encargadoId && (encargadoId === '__unassigned__' ? Boolean(ev.encargadoId) : ev.encargadoId !== encargadoId)) return false;
      switch (filter) {
        case 'hoy':
          return ev.fecha === hoyStr;
        case 'proximos':
          return !eventHasPassed(ev, now) && eventState(ev) === 'Próximo';
        case 'resultados':
          return pendingEventResult(ev, now);
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
  }, [eventsWithCase, filter, hoyStr, weekStart, weekEnd, dateFilter, dateFrom, dateTo, encargadoId, now]);

  const countHoy = eventsWithCase.filter((e) => e.fecha === hoyStr).length;
  const countAudiencias = eventsWithCase.filter((e) => e.tipo === 'Audiencia' && e.fecha >= hoyStr && eventState(e) === 'Próximo').length;
  const countPlazos = eventsWithCase.filter((e) => e.tipo === 'Plazo' && e.fecha >= hoyStr && eventState(e) === 'Próximo').length;

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
        <button type="button" onClick={() => setFilter('resultados')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${filter === 'resultados' ? 'bg-brand-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Pendientes de resultado</button>
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
        <label htmlFor="agenda-encargado" className="ml-2 text-xs font-semibold text-slate-600">Encargado:</label>
        <select id="agenda-encargado" value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-900">
          <option value="">Todos</option>
          <option value="__unassigned__">Sin encargado</option>
          {assignees.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.estado === 'Inactivo' ? ' (inactivo)' : ''}</option>)}
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
    </div>
  );
};
