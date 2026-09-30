import React from 'react';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface AlertBadgeProps {
  alerta?: {
    mensaje: string;
    tipo: 'hoy' | 'urgente' | 'proximo' | 'pasado';
  };
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({ alerta }) => {
  if (!alerta) return null;

  const config = {
    hoy: {
      bg: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-300',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />,
    },
    urgente: {
      bg: 'bg-amber-50 text-amber-900 border-amber-300',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    proximo: {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
    },
    pasado: {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: <CheckCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
  }[alerta.tipo];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg}`}
    >
      {config.icon}
      <span>{alerta.mensaje}</span>
    </span>
  );
};
