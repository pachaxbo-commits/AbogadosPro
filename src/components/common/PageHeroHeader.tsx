import type { ReactNode } from 'react';

type PageHeroHeaderProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  titleAccessory?: ReactNode;
};

export function PageHeroHeader({ title, subtitle, actions, titleAccessory }: PageHeroHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 rounded-2xl border border-brand-800 bg-brand-900 px-5 py-6 text-white shadow-sm sm:px-7">
      <div className="min-w-0">
        <span className="mb-3 block h-0.5 w-9 bg-amber-400" aria-hidden="true" />
        {titleAccessory ? (
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            {titleAccessory}
          </div>
        ) : (
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        )}
        <p className="mt-2 text-sm text-slate-200">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
