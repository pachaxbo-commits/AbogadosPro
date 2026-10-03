import React from 'react';
import { EventMenu } from './EventMenu';
import { Link } from 'react-router-dom';
import { EventoConCaso } from '../../types';
import { useProfile } from '../../context/ProfileContext';
import { formatFecha, formatHora } from '../../services/formatters';
import { AlertBadge } from '../common/AlertBadge';
import { AreaBadge } from '../common/StatusBadge';
import { EventResultAction, EventResultStatus } from './EventResultAction';
import {
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  User,
  ArrowRight,
} from 'lucide-react';

interface EventCardProps {
  evento: EventoConCaso;
  showCaseLink?: boolean;
  summary?: boolean;
  onEdit?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  evento,
  showCaseLink = true,
  summary = false,
  onEdit,
}) => {
  const { assignees } = useProfile();
  const interactive = Boolean(onEdit);
  const getTipoStyle = (tipo: string) => {
    switch (tipo) {
      case 'Audiencia':
        return 'border-l-4 border-l-rose-500';
      case 'Plazo':
        return 'border-l-4 border-l-amber-500';
      case 'Actuado':
        return 'border-l-4 border-l-blue-500';
      case 'Reunión':
        return 'border-l-4 border-l-purple-500';
      default:
        return 'border-l-4 border-l-slate-400';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors ${interactive ? 'relative hover:bg-brand-50/40 focus-within:ring-1 focus-within:ring-brand-200 cursor-pointer' : ''} ${summary ? 'p-5 border-l-4 border-l-brand-900' : 'p-4 ' + getTipoStyle(
        evento.tipo
      )}`}
    >
      {interactive && <Link to={`/casos/${evento.casoId}?tab=agenda&evento=${encodeURIComponent(evento.id)}`} aria-label={`Ver evento ${evento.titulo} en la agenda del caso`} className="absolute inset-0 z-10 rounded-lg" />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {evento.tipo}
          </span>
          {!summary && <AreaBadge area={evento.casoArea} />}
          {interactive && <EventResultStatus event={evento} />}
          {evento.alertaVisual && <AlertBadge alerta={evento.alertaVisual} />}
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex flex-wrap items-center gap-2 text-slate-700 w-fit ${summary ? 'text-sm py-2' : 'text-xs font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200'}`}>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{formatFecha(evento.fecha)}</span>
            {evento.hora && (
              <>
                <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
                <span>{formatHora(evento.hora)}</span>
              </>
            )}
          </div>
          {interactive && (
            <EventMenu evento={evento} onEdit={onEdit} />
          )}
        </div>
      </div>

      <h3 className={`font-semibold text-slate-900 break-words ${summary ? 'text-base mb-4' : 'text-sm mb-1'}`}>{evento.titulo}</h3>
      {!summary && evento.encargadoId && <p className="mb-2 text-xs text-slate-600">Encargado: <span className="font-medium text-brand-900">{assignees.find((item) => item.id === evento.encargadoId)?.nombre || 'No disponible'}</span></p>}
      {interactive && <EventResultAction event={evento} />}

      {!summary && evento.juzgado && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{evento.juzgado}</span>
        </div>
      )}

      {!summary && evento.descripcion && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {evento.descripcion}
        </p>
      )}

      <div className={`pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 ${summary ? 'text-sm' : 'text-xs'}`}>
        <div className="flex flex-wrap items-center gap-3 text-slate-600">
          <div className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-700">{evento.casoNombre}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{evento.clienteNombre}</span>
          </div>
        </div>

        {showCaseLink && (interactive ? (
          <Link to={`/casos/${evento.casoId}`} className="relative z-20 inline-flex items-center gap-1 font-semibold text-brand-900 hover:text-brand-700 hover:underline">Ver caso →</Link>
        ) : (
          <Link
            to={`/casos/${evento.casoId}`}
            className={`inline-flex items-center gap-1 font-semibold text-brand-900 hover:text-brand-700 hover:underline ${summary ? 'min-h-11 px-2' : ''}`}
          >
            <span>{summary ? 'Ver caso →' : 'Ver Expediente'}</span>
            {!summary && <ArrowRight className="w-3.5 h-3.5" />}
          </Link>
        ))}
      </div>
    </div>
  );
};
