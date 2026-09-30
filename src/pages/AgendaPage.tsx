import React, { useState, useMemo } from 'react';
import { useLegalData } from '../context/LegalDataContext';
import { EventCard } from '../components/events/EventCard';
import { EventFormModal } from '../components/events/EventFormModal';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Scale,
  Users,
  AlertCircle,
} from 'lucide-react';

type FilterType = 'todos' | 'hoy' | 'proximos' | 'audiencias' | 'plazos' | 'reuniones';

export const AgendaPage: React.FC = () => {
  const { eventsWithCase } = useLegalData();
  const [filter, setFilter] = useState<FilterType>('proximos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hoyStr = new Date().toISOString().split('T')[0];

  const filteredEvents = useMemo(() => {
    return eventsWithCase.filter((ev) => {
      switch (filter) {
        case 'hoy':
          return ev.fecha === hoyStr;
        case 'proximos':
          return ev.fecha >= hoyStr;
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
  }, [eventsWithCase, filter, hoyStr]);

  const countHoy = eventsWithCase.filter((e) => e.fecha === hoyStr).length;
  const countAudiencias = eventsWithCase.filter((e) => e.tipo === 'Audiencia' && e.fecha >= hoyStr).length;
  const countPlazos = eventsWithCase.filter((e) => e.tipo === 'Plazo' && e.fecha >= hoyStr).length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agenda Jurídica General
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
            <EventCard key={ev.id} evento={ev} showCaseLink={true} />
          ))
        )}
      </div>

      {/* Modal Agendar Evento */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
