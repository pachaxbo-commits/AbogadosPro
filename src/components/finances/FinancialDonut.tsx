import { useState } from 'react';
import { financialComposition } from '../../services/finance';
import { formatBs } from '../../services/formatters';

export function FinancialDonut({ totals }: { totals: Parameters<typeof financialComposition>[0] }) {
  const amounts = financialComposition(totals);
  const [selected, setSelected] = useState(0);
  // Tres anillos independientes: caja neta, gastos no recuperados y deuda no forman
  // partes de un único total contable. Nunca se presentan porcentajes sumables.
  const metrics = [
    { name: 'Utilidad de caja', value: amounts.utilidad, color: '#047857' },
    { name: 'Gastos no recuperados', value: amounts.gastos, color: '#b45309' },
    { name: 'Por cobrar', value: amounts.porCobrar, color: '#1e40af' },
  ];
  const scale = Math.max(...metrics.map(item => Math.abs(item.value)), 1);
  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-base font-bold text-slate-900">Situación financiera</h2>
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 240 240" className="h-60 w-60 shrink-0" role="group" aria-label="Dona comparativa: tres anillos independientes">
        {metrics.map((item, index) => {
          const radius = 99 - index * 24;
          const length = 2 * Math.PI * radius;
          return <g key={item.name} role="button" tabIndex={0} aria-label={`${item.name}: ${formatBs(item.value)}`} onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(index); } }} className="cursor-pointer focus:outline-none">
            <title>{item.name}: {formatBs(item.value)}</title>
            <circle cx="120" cy="120" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
            <circle cx="120" cy="120" r={radius} fill="none" stroke={item.color} strokeWidth={selected === index ? 21 : 18} strokeDasharray={`${Math.abs(item.value) / scale * length} ${length}`} transform="rotate(-90 120 120)" />
          </g>;
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-3">
        <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><span>{metrics[selected].name}</span><strong className="ml-3 font-mono">{formatBs(metrics[selected].value)}</strong></div>
        {metrics.map((item, index) => <button key={item.name} type="button" onClick={() => setSelected(index)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"><span><span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: item.color }} />{item.name}</span><strong className="font-mono">{formatBs(item.value)}</strong></button>)}
        <p className="text-xs text-slate-500">Anillos independientes con la misma escala en Bs; no son porcentajes de un total. Utilidad de caja = honorarios cobrados + reembolsos recibidos − gastos registrados. Por cobrar incluye honorarios y gastos pendientes de reembolso.</p>
        {amounts.utilidad < 0 && <p className="text-sm text-rose-700">Déficit de caja: {formatBs(-amounts.utilidad)}. El anillo muestra su magnitud; no representa ganancia.</p>}
      </div>
    </div>
  </section>;
}
