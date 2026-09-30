import React from 'react';
import { AreaCaso, EstadoCaso, TipoIdentificacionJudicial } from '../../types';

interface StatusBadgeProps {
  status: EstadoCaso;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'Activo':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'En trámite':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'En espera':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Concluido':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()}`}
    >
      {status}
    </span>
  );
};

interface AreaBadgeProps {
  area: AreaCaso;
}

export const AreaBadge: React.FC<AreaBadgeProps> = ({ area }) => {
  const getStyle = () => {
    switch (area) {
      case 'Civil':
        return 'bg-sky-50 text-sky-900 border-sky-200';
      case 'Penal':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      case 'Familiar':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'Laboral':
        return 'bg-teal-50 text-teal-900 border-teal-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${getStyle()}`}
    >
      {area}
    </span>
  );
};

interface JudicialIdBadgeProps {
  tipo: TipoIdentificacionJudicial;
  numero: string;
}

export const JudicialIdBadge: React.FC<JudicialIdBadgeProps> = ({ tipo, numero }) => {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
      <span className="font-semibold text-slate-500 uppercase">{tipo}:</span>
      <span>{numero}</span>
    </span>
  );
};
