import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { useProfile } from '../../context/ProfileContext';
import type { CategoryGroup } from '../../repositories/configurationRepository';

const groups: { key: CategoryGroup; title: string; placeholder: string }[] = [
  { key: 'areas', title: 'Áreas jurídicas', placeholder: 'Nueva área jurídica' },
  { key: 'documents', title: 'Categorías de documentos', placeholder: 'Nueva categoría de documento' },
  { key: 'events', title: 'Tipos de eventos', placeholder: 'Nuevo tipo de evento' },
  { key: 'expenses', title: 'Categorías de gastos', placeholder: 'Nueva categoría de gasto' },
  { key: 'activities', title: 'Tipos de actividad', placeholder: 'Nuevo tipo de actividad' },
];
const action = 'min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-brand-900 hover:bg-brand-50';

function CategoryBlock({ group, title, placeholder, expanded, onToggle, isUsed, unavailable }: { group: CategoryGroup; title: string; placeholder: string; expanded: boolean; onToggle: () => void; isUsed: (value: string) => boolean; unavailable?: boolean }) {
  const { configuration, setCategoryOptions } = useProfile();
  const options = configuration.categories[group];
  const [newValue, setNewValue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const normalized = (value: string) => value.trim().replace(/\s+/g, ' ');
  const save = (value: string, previous?: string) => {
    const name = normalized(value);
    setMessage('');
    if (!name || name.length > 80) { setError('Escribe un nombre de hasta 80 caracteres.'); return; }
    if (options.some((option) => option !== previous && option.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) { setError('Esta opción ya existe.'); return; }
    if (previous && isUsed(previous)) { setError('Esta opción está en uso. No se puede editar sin modificar registros existentes.'); return; }
    try {
      setCategoryOptions(group, previous ? options.map((option) => option === previous ? name : option) : [...options, name]);
      setNewValue(''); setEditing(null); setError(''); setMessage(previous ? 'Opción actualizada.' : 'Opción agregada.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la opción.'); }
  };
  const remove = (value: string) => {
    setMessage('');
    if (isUsed(value)) { setError('Esta opción está en uso y no puede eliminarse. Los registros existentes se conservaron.'); return; }
    if (options.length === 1) { setError('Debe quedar al menos una opción disponible.'); return; }
    try { setCategoryOptions(group, options.filter((option) => option !== value)); setError(''); setMessage('Opción eliminada.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la opción.'); }
  };
  return <div className="rounded-md border border-slate-200">
    <h3><button type="button" aria-expanded={expanded} aria-controls={`category-options-${group}`} onClick={onToggle} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-brand-50"><span>{title} <span className="font-normal text-slate-500">· {options.length}</span></span><ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button></h3>
    <div id={`category-options-${group}`} hidden={!expanded} className="border-t border-slate-100 px-3 pb-3 pt-1">
    {unavailable ? <p role="alert" className="py-3 text-sm text-rose-700">No se pueden administrar estas categorías mientras sus registros no estén disponibles.</p> : <>
    <ul className="mt-3 space-y-2">{options.map((value) => <li key={value} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      {editing === value ? <input aria-label={`Editar ${value}`} autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save(editValue, value); }} className="min-h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm" /> : <span className="min-w-0 break-words text-sm text-slate-700">{value}</span>}
      <span className="flex gap-2">{editing === value ? <><button type="button" className={action} onClick={() => save(editValue, value)}>Guardar</button><button type="button" className={action} onClick={() => { setEditing(null); setError(''); }}>Cancelar</button></> : <><button type="button" className={action} onClick={() => { setEditing(value); setEditValue(value); setError(''); setMessage(''); }}>Editar</button><button type="button" className={`${action} text-rose-700`} onClick={() => remove(value)}>Eliminar</button></>}</span>
    </li>)}</ul>
    <div className="mt-3 flex flex-wrap gap-2"><input aria-label={`Nueva opción para ${title}`} placeholder={placeholder} value={newValue} onChange={(event) => setNewValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save(newValue); }} className="min-h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm" /><button type="button" className={action} onClick={() => save(newValue)}>Agregar</button></div>
    {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}{message && <p role="status" className="mt-2 text-xs text-brand-900">{message}</p>}
    </>}
    </div>
  </div>;
}

export function CategorySettings() {
  const { cases, documents, documentsError, events, expenses, activities, loading } = useLegalData();
  const [expanded, setExpanded] = useState<CategoryGroup | null>(null);
  const isUsed = (group: CategoryGroup, value: string) => {
    switch (group) {
      case 'areas': return cases.some((item) => item.area === value);
      case 'documents': return documents.some((item) => item.categoria === value);
      case 'events': return events.some((item) => item.tipo === value);
      case 'expenses': return expenses.some((item) => item.categoria === value || (!item.categoria && item.concepto === value));
      case 'activities': return activities.some((item) => item.tipo === value);
    }
  };
  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-categories">
    <h2 id="settings-categories" className="text-lg font-semibold text-brand-900">Categorías</h2>
    <p className="mt-1 text-sm text-slate-500">Opciones disponibles en los formularios. Las que ya usan registros no pueden cambiarse ni eliminarse.</p>
    {loading ? <p className="mt-4 text-sm text-slate-500">Cargando registros…</p> : <div className="mt-5 space-y-2">{groups.map(({ key, title, placeholder }) => <CategoryBlock key={key} group={key} title={title} placeholder={placeholder} expanded={expanded === key} onToggle={() => setExpanded((current) => current === key ? null : key)} isUsed={(value) => isUsed(key, value)} unavailable={key === 'documents' && !!documentsError} />)}</div>}
  </section>;
}
