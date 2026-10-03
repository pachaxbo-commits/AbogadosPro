import React from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'danger';
  compact?: boolean;
  to?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  badgeType = 'default',
  compact = false,
  to,
  onClick,
  selected = false,
  className: extraClassName = '',
}) => {
  const badgeClasses = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
  }[badgeType];

  const interactive = Boolean(to || onClick);
  const className = `block bg-white rounded-lg border shadow-xs transition-colors ${compact ? 'p-4' : 'p-5'} ${selected ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'}${interactive ? ' w-full text-left cursor-pointer select-none hover:bg-brand-50/60 hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-900' : ''} ${extraClassName}`;
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
          {selected && <span aria-hidden="true" className="ml-1 text-brand-900">✓</span>}
        </span>
        <div className="p-2 bg-slate-50 text-brand-900 rounded-lg border border-slate-100">
          {icon}
        </div>
      </div>
      <div className={`${compact ? 'mt-2' : 'mt-3'} flex items-baseline gap-2`}>
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </>
  );

  if (to) return <Link to={to} className={className}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={selected} className={className}>{content}</button>;
  return <div className={className}>{content}</div>;
};
