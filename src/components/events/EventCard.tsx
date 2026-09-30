import React from 'react';
import { Link } from 'react-router-dom';
import { EventoConCaso } from '../../types';
import { formatFecha, formatHora } from '../../services/formatters';
import { AlertBadge } from '../common/AlertBadge';
import { AreaBadge } from '../common/StatusBadge';
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
}

export const EventCard: React.FC<EventCardProps> = ({
  evento,
  showCaseLink = true,
}) => {
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
      className={`bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all ${getTipoStyle(
        evento.tipo
      )}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {evento.tipo}
          </span>
          <AreaBadge area={evento.casoArea} />
          {evento.alertaVisual && <AlertBadge alerta={evento.alertaVisual} />}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 w-fit">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{formatFecha(evento.fecha)}</span>
          {evento.hora && (
            <>
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <span>{formatHora(evento.hora)}</span>
            </>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{evento.titulo}</h3>

      {evento.juzgado && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{evento.juzgado}</span>
        </div>
      )}

      {evento.descripcion && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {evento.descripcion}
        </p>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
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

        {showCaseLink && (
          <Link
            to={`/casos/${evento.casoId}`}
            className="inline-flex items-center gap-1 font-semibold text-brand-900 hover:text-brand-700 hover:underline"
          >
            <span>Ver Expediente</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
