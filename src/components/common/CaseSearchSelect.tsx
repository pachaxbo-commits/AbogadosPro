import { useEffect, useRef, useState } from 'react';

export interface CaseOption { id: string; nombre: string; clienteNombre: string; tipoIdentificacionJudicial: string; numeroIdentificacionJudicial: string }
// La fuente puede consultar datos locales o un backend; la UI solo recibe resultados limitados.
export function CaseSearchSelect({ id, selected, onSelect, search }: {
  id: string; selected?: CaseOption; onSelect: (id: string) => void;
  search: (query: string, limit: number) => Promise<CaseOption[]>;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let valid = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      search(query, 10).then((items) => { if (valid) { setResults(items.slice(0, 10)); setActive(0); } })
        .catch(() => { if (valid) { setResults([]); setError('No se pudieron buscar los casos.'); } })
        .finally(() => { if (valid) setLoading(false); });
    }, 100);
    return () => { valid = false; clearTimeout(timer); };
  }, [query, open, search]);
  const choose = (item: CaseOption) => { onSelect(item.id); setQuery(''); setOpen(false); };
  return <div ref={root} className="relative mt-1" onBlur={(event) => { if (!root.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={open && results[active] ? `${id}-option-${active}` : undefined}
      autoComplete="off" placeholder="Buscar caso, cliente, NUREJ o CUD…" value={open ? query : selected?.nombre || ''}
      onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setResults([]); setLoading(true); setOpen(true); setActive(0); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive((index) => Math.max(0, Math.min(results.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)))); }
        if (e.key === 'Enter' && open) { e.preventDefault(); if (!loading && results[active]) choose(results[active]); }
      }} className="w-full min-w-0 min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-brand-900" />
    {selected && <p className="mt-1 text-xs text-slate-500 break-words">Seleccionado: {selected.nombre} · {selected.clienteNombre}{selected.numeroIdentificacionJudicial && ` · ${selected.tipoIdentificacionJudicial} ${selected.numeroIdentificacionJudicial}`}</p>}
    {open && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm">
      {loading ? <p role="status" className="p-3 text-sm text-slate-500">Buscando…</p> : error ? <p role="alert" className="p-3 text-sm text-rose-700">{error}</p> : results.length === 0 ? <p className="p-3 text-sm text-slate-500">Sin resultados</p> : null}
      <div id={`${id}-results`} role="listbox" aria-label="Casos encontrados">{!loading && results.map((item, index) => <button key={item.id} id={`${id}-option-${index}`} type="button" role="option" aria-selected={selected?.id === item.id} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)} className={`block w-full px-3 py-2 text-left hover:bg-brand-50 ${active === index ? 'bg-brand-50' : ''}`}>
        <span className="block text-sm font-semibold text-slate-900">{item.nombre}</span><span className="mt-1 block text-xs text-slate-500">{item.clienteNombre}{item.numeroIdentificacionJudicial && ` · ${item.tipoIdentificacionJudicial} ${item.numeroIdentificacionJudicial}`}</span>
      </button>)}</div>
    </div>}
  </div>;
}
