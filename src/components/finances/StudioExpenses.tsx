import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Wallet, Clock, Receipt, TrendingUp } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatCard } from '../common/StatCard';
import { FinancialDonut } from './FinancialDonut';
import { useLegalData } from '../../context/LegalDataContext';
import { studioExpensesRepository } from '../../repositories/studioExpensesRepository';
import { inStudioRange, studioFinanceSummary, type StudioDateRange } from '../../services/studioFinance';
import { STUDIO_EXPENSE_CATEGORIES, type StudioExpense, type StudioExpenseCategory, type StudioExpenseInput } from '../../types/studioExpense';
import { formatBs, formatFecha } from '../../services/formatters';
import { taskToday, validTaskDate } from '../../services/tasks';

const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700';

type RangePreset = 'this-month' | 'previous-month' | 'this-year' | 'all' | 'custom';
function presetRange(preset: Exclude<RangePreset, 'custom'>): StudioDateRange {
  const today = taskToday(new Date());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  if (preset === 'all') return { from: '', to: '' };
  if (preset === 'this-year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const first = preset === 'previous-month' ? new Date(Date.UTC(year, month - 2, 1)) : new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function ExpenseForm({ expense, onClose, onSave }: { expense?: StudioExpense; onClose: () => void; onSave: (data: StudioExpenseInput) => void }) {
  const [concepto, setConcepto] = useState(expense?.concepto || '');
  const [categoria, setCategoria] = useState<StudioExpenseCategory>(expense?.categoria || STUDIO_EXPENSE_CATEGORIES[0]);
  const [monto, setMonto] = useState(expense ? String(expense.monto) : '');
  const [fecha, setFecha] = useState(expense?.fecha || taskToday(new Date()));
  const [nota, setNota] = useState(expense?.nota || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try { onSave({ concepto, categoria, monto: Number(monto), fecha, nota }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el gasto general.'); }
    finally { setSaving(false); }
  };
  return <Modal isOpen title={expense ? 'Editar gasto general' : 'Registrar gasto general'} subtitle="Gasto administrativo del estudio, sin relación con clientes ni casos" onClose={() => { if (!saving) onClose(); }} maxWidth="md">
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      <div><label htmlFor="studio-expense-concept" className={label}>Concepto *</label><input id="studio-expense-concept" required maxLength={160} value={concepto} onChange={event => setConcepto(event.target.value)} className={field} /></div>
      <div><label htmlFor="studio-expense-category" className={label}>Categoría *</label><select id="studio-expense-category" value={categoria} onChange={event => setCategoria(event.target.value as StudioExpenseCategory)} className={field}>{STUDIO_EXPENSE_CATEGORIES.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label htmlFor="studio-expense-amount" className={label}>Monto (Bs) *</label><input id="studio-expense-amount" type="number" required min="0.01" step="0.01" value={monto} onChange={event => setMonto(event.target.value)} className={field} /></div>
        <div><label htmlFor="studio-expense-date" className={label}>Fecha *</label><input id="studio-expense-date" type="date" required value={fecha} onChange={event => setFecha(event.target.value)} className={field} /></div>
      </div>
      <div><label htmlFor="studio-expense-note" className={label}>Descripción / nota (opcional)</label><textarea id="studio-expense-note" rows={3} maxLength={2000} value={nota} onChange={event => setNota(event.target.value)} className={field} /></div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50">Cancelar</button><button type="submit" disabled={saving} className="rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Guardando…' : expense ? 'Guardar cambios' : 'Registrar gasto'}</button></div>
    </form>
  </Modal>;
}

export function StudioExpenses({ workspaceId }: { workspaceId: string }) {
  const { cases, payments, expenses, reimbursements } = useLegalData();
  const [state, setState] = useState<{ items: StudioExpense[]; error: string }>(() => {
    try { return { items: studioExpensesRepository.list(workspaceId), error: '' }; }
    catch (cause) { return { items: [], error: cause instanceof Error ? cause.message : 'No se pudieron cargar los gastos generales.' }; }
  });
  const [editing, setEditing] = useState<StudioExpense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<StudioExpense | null>(null);
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState<StudioDateRange>(() => presetRange('this-month'));
  const [draft, setDraft] = useState<StudioDateRange>(() => presetRange('this-month'));
  const [preset, setPreset] = useState<RangePreset>('this-month');
  const [dateError, setDateError] = useState('');
  const sorted = useMemo(() => state.items.filter(item => inStudioRange(item.fecha, range)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt)), [state.items, range]);
  const summary = useMemo(() => studioFinanceSummary(cases, payments, expenses, reimbursements, state.items, range), [cases, payments, expenses, reimbursements, state.items, range]);
  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    if ((draft.from && !validTaskDate(draft.from)) || (draft.to && !validTaskDate(draft.to)) || (draft.from && draft.to && draft.from > draft.to)) {
      setDateError('Selecciona un rango de fechas válido.');
      return;
    }
    setDateError('');
    setRange({ ...draft });
    setPreset('custom');
  };
  const choosePreset = (value: Exclude<RangePreset, 'custom'>) => {
    const next = presetRange(value);
    setDraft(next);
    setRange(next);
    setPreset(value);
    setDateError('');
  };
  const save = (data: StudioExpenseInput) => {
    const items = editing && editing !== 'new' ? studioExpensesRepository.update(workspaceId, editing.id, data) : studioExpensesRepository.add(workspaceId, data);
    setState({ items, error: '' });
    setEditing(null);
  };
  const remove = () => {
    if (!deleting || busy) return;
    setBusy(true);
    try { setState({ items: studioExpensesRepository.remove(workspaceId, deleting.id), error: '' }); setDeleting(null); }
    catch (cause) { setState(current => ({ ...current, error: cause instanceof Error ? cause.message : 'No se pudo eliminar el gasto general.' })); }
    finally { setBusy(false); }
  };

  return <section className="space-y-4" aria-labelledby="studio-expenses-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="studio-expenses-title" className="text-lg font-bold text-slate-900">Finanzas del estudio</h2><p className="mt-1 text-xs text-slate-500">Ingresos, gastos y saldos del negocio en el período seleccionado</p></div></div>
    <form onSubmit={applyRange} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-auto"><label htmlFor="studio-from" className={label}>Desde</label><input id="studio-from" type="date" value={draft.from} onChange={event => { setDraft(current => ({ ...current, from: event.target.value })); setPreset('custom'); }} className={field} /></div>
        <div className="w-full sm:w-auto"><label htmlFor="studio-to" className={label}>Hasta</label><input id="studio-to" type="date" value={draft.to} onChange={event => { setDraft(current => ({ ...current, to: event.target.value })); setPreset('custom'); }} className={field} /></div>
        <button type="submit" className="min-h-10 w-full rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 sm:w-auto">Aplicar</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{([['this-month', 'Este mes'], ['previous-month', 'Mes anterior'], ['this-year', 'Este año'], ['all', 'Todo']] as const).map(([value, text]) => <button key={value} type="button" onClick={() => choosePreset(value)} aria-pressed={preset === value} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${preset === value ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-200 text-brand-900 hover:bg-brand-50'}`}>{text}</button>)}</div>
      {dateError && <p role="alert" className="mt-2 text-xs text-rose-700">{dateError}</p>}
      <p className="mt-2 text-xs text-slate-500">Período aplicado: {range.from ? formatFecha(range.from) : 'sin inicio'} – {range.to ? formatFecha(range.to) : 'sin fin'}. Por cobrar es el saldo al cierre; los honorarios históricos usan el valor acordado actualmente.</p>
    </form>
    {state.error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard compact title="Ingresos cobrados" value={formatBs(summary.income)} icon={<TrendingUp className="h-5 w-5 text-emerald-700" />} />
      <StatCard compact title="Por cobrar a clientes" value={formatBs(summary.receivable)} subtitle="Saldo al cierre; no es ingreso" icon={<Clock className="h-5 w-5 text-blue-700" />} />
      <StatCard compact title="Gastos de casos" value={formatBs(summary.caseCosts)} subtitle="No reembolsables" icon={<Receipt className="h-5 w-5 text-amber-700" />} />
      <StatCard compact title="Gastos generales registrados" value={formatBs(summary.generalCosts)} icon={<Receipt className="h-5 w-5 text-slate-700" />} />
      <StatCard compact title="Utilidad / resultado" value={formatBs(summary.profit)} subtitle="Ingresos cobrados menos gastos del estudio" icon={<Wallet className="h-5 w-5 text-brand-900" />} />
    </div>
    <FinancialDonut studio={{ utilidad: summary.profit, porCobrar: summary.receivable, gastosCasos: summary.caseCosts, gastosGenerales: summary.generalCosts }} />
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <h3 className="text-base font-bold text-slate-900">Distribución de gastos</h3>
      {summary.distribution.length === 0 ? <p className="mt-3 text-sm text-slate-500">No hay gastos del estudio en este período.</p> : <div className="mt-4 space-y-3">{summary.distribution.map(item => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="text-slate-700">{item.name}</span><strong className="font-mono text-slate-900">{formatBs(item.value)}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-700" style={{ width: `${item.value / (summary.caseCosts + summary.generalCosts) * 100}%` }} /></div></div>)}</div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Gastos generales</h3><p className="mt-1 text-xs text-slate-500">Historial administrativo del período</p></div><button type="button" onClick={() => setEditing('new')} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"><Plus className="h-4 w-4" />Registrar gasto</button></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {sorted.length === 0 ? <p className="p-6 text-sm text-slate-500">No hay gastos generales en este período.</p> : <div className="overflow-x-auto"><table className="mobile-data-table w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{sorted.map(item => <tr key={item.id} className="hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{formatFecha(item.fecha)}</td><td data-label="Concepto" className="px-4 py-3"><span className="font-semibold text-slate-900">{item.concepto}</span>{item.nota && <p className="mt-0.5 max-w-md whitespace-pre-wrap break-words text-xs text-slate-500">{item.nota}</p>}</td><td data-label="Categoría" className="px-4 py-3 text-xs text-slate-600">{item.categoria}</td><td data-label="Monto" className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-slate-900">{formatBs(item.monto)}</td><td data-label="Acciones" className="whitespace-nowrap px-4 py-3 text-right"><button type="button" onClick={() => setEditing(item)} className="rounded px-2 py-1 text-xs font-semibold text-brand-900 hover:bg-brand-50">Editar</button><button type="button" onClick={() => setDeleting(item)} className="rounded px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Eliminar</button></td></tr>)}</tbody></table></div>}
    </div>
    {editing && <ExpenseForm key={editing === 'new' ? 'new' : editing.id} expense={editing === 'new' ? undefined : editing} onSave={save} onClose={() => setEditing(null)} />}
    {deleting && <Modal isOpen title="Eliminar gasto general" onClose={() => { if (!busy) setDeleting(null); }} maxWidth="sm"><p className="text-sm text-slate-700">¿Eliminar “{deleting.concepto}” por {formatBs(deleting.monto)}?</p>{state.error && <p role="alert" className="mt-3 text-xs text-rose-700">{state.error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setDeleting(null)} className="rounded-md border border-slate-200 px-4 py-2 text-sm">Cancelar</button><button type="button" disabled={busy} onClick={remove} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Eliminar</button></div></Modal>}
  </section>;
}
