import { useState } from 'react';
import { financialDonutComposition } from '../../services/finance';
import { formatBs } from '../../services/formatters';

type StudioAmounts = { utilidad: number; porCobrar: number; gastosCasos: number; gastosGenerales: number };

export function FinancialDonut({ totals, studio }: { totals: Parameters<typeof financialDonutComposition>[0]; studio?: never } | { studio: StudioAmounts; totals?: never }) {
  const amounts = studio ? null : financialDonutComposition(totals!);
  const [selected, setSelected] = useState<number | null>(null);
  const metrics = studio ? [
    { name: 'Utilidad', value: studio.utilidad, color: '#047857' },
    { name: 'Por cobrar a clientes', value: studio.porCobrar, color: '#1e40af' },
    { name: 'Gastos de casos', value: studio.gastosCasos, color: '#b45309' },
    { name: 'Gastos generales', value: studio.gastosGenerales, color: '#7c3aed' },
  ] : [
    { name: 'Utilidad', value: amounts!.utilidad, color: '#047857' },
    { name: 'Por cobrar', value: amounts!.porCobrar, color: '#1e40af' },
    { name: 'Gastos/Pérdida', value: amounts!.perdida, color: '#b45309' },
  ];
  const total = metrics.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  let completed = 0;
  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-base font-bold text-slate-900">{studio ? 'Situación financiera del estudio' : 'Situación financiera'}</h2>
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative mx-auto h-52 w-52 shrink-0 sm:mx-0 sm:h-60 sm:w-60">
        <svg viewBox="0 0 240 240" className="h-full w-full" role="group" aria-label={`Situación financiera: una dona proporcional de ${metrics.length} segmentos`} onMouseLeave={() => setSelected(null)}>
          <circle cx="120" cy="120" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="46" />
          {metrics.map((item, index) => {
            const length = total > 0 ? Math.max(0, item.value) / total * circumference : 0;
            const offset = completed;
            completed += length;
            if (length === 0) return null;
            return <circle key={item.name} cx="120" cy="120" r={radius} fill="none" stroke={item.color} strokeWidth="46"
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 120 120)"
              role="button" tabIndex={0} aria-label={`${item.name}: ${formatBs(item.value)}`}
              onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(index); } }}
              className="cursor-pointer focus:outline-none" />;
          })}
        </svg>
        {selected !== null && <div role="tooltip" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-xs text-slate-900">
          <span className="max-w-28 leading-tight">{metrics[selected].name}</span><strong className="mt-1 font-mono">{formatBs(metrics[selected].value)}</strong>
        </div>}
      </div>
      <div className="w-full min-w-0 flex-1 space-y-3">
        {metrics.map((item, index) => <button key={item.name} type="button" onClick={() => setSelected(index)} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"><span className="min-w-0 break-words"><span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />{item.name}</span><strong className="shrink-0 font-mono">{formatBs(item.value)}</strong></button>)}
        {metrics[0].value < 0 && <p className="text-sm text-rose-700">{studio ? 'Resultado negativo' : 'Déficit de caja'}: {formatBs(-metrics[0].value)}. Se muestra en la leyenda y no ocupa un segmento positivo.</p>}
      </div>
    </div>
  </section>;
}
