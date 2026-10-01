import React from 'react';
import { Actividad } from '../../types';
import { formatFecha, formatHora } from '../../services/formatters';
import {
  FileText,
  Bell,
  Scale,
  FileCheck,
  Users,
  MessageSquare,
  Clock,
} from 'lucide-react';

interface ActivityTimelineProps {
  activities: Actividad[];
  onAddClick?: () => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  onAddClick,
}) => {
  // Ordenar cronológicamente descendente (más reciente primero)
  const sortedActivities = [...activities].sort((a, b) => {
    const dtA = `${a.fecha}T${a.hora || '00:00'}`;
    const dtB = `${b.fecha}T${b.hora || '00:00'}`;
    return dtB.localeCompare(dtA);
  });

  const getTipoIcon = (tipo: Actividad['tipo']) => {
    switch (tipo) {
      case 'Memorial presentado':
        return <FileText className="w-4 h-4 text-blue-700" />;
      case 'Notificación recibida':
        return <Bell className="w-4 h-4 text-amber-600" />;
      case 'Audiencia realizada':
        return <Scale className="w-4 h-4 text-rose-600" />;
      case 'Documento presentado':
        return <FileCheck className="w-4 h-4 text-emerald-600" />;
      case 'Reunión con cliente':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'Nota interna':
        return <MessageSquare className="w-4 h-4 text-slate-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTipoBadge = (tipo: Actividad['tipo']) => {
    switch (tipo) {
      case 'Memorial presentado':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Notificación recibida':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Audiencia realizada':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Documento presentado':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Reunión con cliente':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Nota interna':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (sortedActivities.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
        <p className="text-sm text-slate-500">No hay actividades registradas.</p>
        {onAddClick && (
          <button
            type="button"
            onClick={onAddClick}
            className="mt-3 inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-md text-white bg-brand-900 hover:bg-brand-800 transition-colors"
          >
            Registrar Primera Actividad
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
      {sortedActivities.map((act) => (
        <div key={act.id} className="relative group">
          {/* Timeline node */}
          <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-slate-400 group-hover:border-brand-900 flex items-center justify-center transition-colors shadow-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-brand-900 transition-colors" />
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${getTipoBadge(act.tipo)}`}>
                  {getTipoIcon(act.tipo)}
                  <span>{act.tipo}</span>
                </span>
                <h4 className="text-sm font-semibold text-slate-900">{act.titulo}</h4>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatFecha(act.fecha)}</span>
                {act.hora && <span className="font-semibold text-slate-700">· {formatHora(act.hora)}</span>}
              </div>
            </div>

            {act.descripcion && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-1 whitespace-pre-line">
                {act.descripcion}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
