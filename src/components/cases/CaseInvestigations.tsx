import { useMemo, useState } from 'react';
import { FileSearch, Search, Trash2 } from 'lucide-react';
import type { Caso } from '../../types';
import type { OfficeUser } from '../../services/internalAuth';
import { Modal } from '../common/Modal';
import {
  deleteCaseInvestigation, investigationAccess, investigationTypes, updateCaseInvestigation,
  type CaseInvestigation, type InvestigationType,
} from '../../services/caseInvestigations';

export function CaseInvestigations({ caso, user, users, items, workspaceId, isDemo }: {
  caso: Caso; user: OfficeUser; users: OfficeUser[]; items: CaseInvestigation[]; workspaceId: string; isDemo: boolean;
}) {
  const [type, setType] = useState('Todo');
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [editType, setEditType] = useState<InvestigationType>('Chat');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const selected = items.find(item => item.id === selectedId);
  const access = investigationAccess(caso, user);
  const canEdit = Boolean(selected && isDemo && (access === 'owner' || access === 'collaborate' && selected.authorUserId === user.id));
  const filtered = useMemo(() => items.filter(item =>
    (type === 'Todo' || item.type === type) &&
    (!query.trim() || item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) &&
    (!author || item.authorUserId === author) &&
    (!date || item.date === date)), [items, type, query, author, date]);
  const open = (item: CaseInvestigation) => { setSelectedId(item.id); setTitle(item.title); setEditType(item.type); setNotes(item.notes); setEditing(false); setError(''); };
  const save = () => {
    if (!selected) return;
    try { updateCaseInvestigation(workspaceId, caso, user, isDemo, selected.id, { title, type: editType, notes }); setEditing(false); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la investigación.'); }
  };
  const remove = () => {
    if (!selected || !window.confirm(`¿Eliminar la investigación «${selected.title}»?`)) return;
    try { deleteCaseInvestigation(workspaceId, caso, user, isDemo, selected.id); setSelectedId(null); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la investigación.'); }
  };
  return <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
    <div className="mb-4"><h2 className="flex items-center gap-2 text-lg font-bold text-brand-900"><FileSearch className="h-5 w-5" />Investigaciones</h2><p className="mt-1 text-xs text-slate-500">Conversaciones jurídicas guardadas para este expediente.</p></div>
    {!isDemo && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">El guardado de investigaciones estará disponible al conectar el almacenamiento seguro del estudio.</p>}
    <div className="mb-4 flex flex-wrap gap-2">
      <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border border-slate-200 px-3"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Buscar investigaciones" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por título" className="min-h-10 min-w-0 flex-1 text-sm outline-none" /></label>
      <select aria-label="Filtrar por tipo" value={type} onChange={event => setType(event.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"><option>Todo</option>{investigationTypes.map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Filtrar por usuario" value={author} onChange={event => setAuthor(event.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="">Todos los usuarios</option>{[...new Set(items.map(item => item.authorUserId))].map(id => <option key={id} value={id}>{users.find(person => person.id === id)?.displayName || 'Usuario anterior'}</option>)}</select>
      <input aria-label="Filtrar por fecha" type="date" value={date} onChange={event => setDate(event.target.value)} className="min-h-10 rounded-md border border-slate-200 bg-white px-2 text-sm" />
    </div>
    <p className="mb-2 text-xs text-slate-500">{filtered.length} de {items.length} investigaciones</p>
    {filtered.length ? <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">{filtered.map(item => <button key={item.id} type="button" onClick={() => open(item)} className="block w-full px-4 py-3 text-left hover:bg-brand-50"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-brand-900">{item.title}</strong><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">{item.type}</span></div><p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p><p className="mt-1 text-xs text-slate-500">{item.date} · {users.find(person => person.id === item.authorUserId)?.displayName || 'Usuario anterior'}</p></button>)}</div> : <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{items.length ? 'No hay investigaciones para estos filtros.' : 'Todavía no hay investigaciones guardadas para este caso.'}</p>}
    <Modal isOpen={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.title || 'Investigación'} subtitle={selected ? `${selected.type} · ${selected.date}` : undefined} maxWidth="xl">
      {selected && <div className="space-y-4 text-sm">
        <p className="text-xs text-slate-500">Autor: {users.find(person => person.id === selected.authorUserId)?.displayName || 'Usuario anterior'} · Caso: {caso.nombre}</p>
        {editing ? <div className="space-y-3"><label className="block text-xs font-semibold">Título<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm" /></label><label className="block text-xs font-semibold">Tipo<select value={editType} onChange={event => setEditType(event.target.value as InvestigationType)} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm">{investigationTypes.map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs font-semibold">Notas<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm" /></label></div> : <><p className="text-slate-700">{selected.summary}</p>{selected.notes && <p className="rounded-md bg-slate-50 p-3 text-slate-700">{selected.notes}</p>}</>}
        {selected.messages.filter(message => message.search).map(message => {
          const search = message.search!;
          const filters = search.filters;
          return <div key={message.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><strong>Consulta guardada:</strong> {search.query}<p className="mt-1">{[
            filters?.source && `Fuente: ${filters.source}`, filters?.matter && `Materia: ${filters.matter}`,
            filters?.topic && `Tema: ${filters.topic}`, filters?.tribunal && `Tribunal: ${filters.tribunal}`,
            filters?.chamber && `Sala: ${filters.chamber}`, filters?.resolutionType && `Tipo: ${filters.resolutionType}`,
            filters?.reference && `Referencia: ${filters.reference}`, filters?.fromDate && `Desde: ${filters.fromDate}`,
            filters?.toDate && `Hasta: ${filters.toDate}`, filters?.searchField && `Campo: ${filters.searchField}`,
            filters?.exactPhrase && 'Frase exacta', filters?.requiredTerms && `Debe contener: ${filters.requiredTerms}`,
            filters?.excludedTerms && `Excluir: ${filters.excludedTerms}`, `Orden: ${filters?.sort || 'relevance'}`,
          ].filter(Boolean).join(' · ')}</p><p className="mt-1">{search.results.length} resultados conservados</p></div>;
        })}
        <div><h3 className="mb-2 font-semibold text-brand-900">Conversación guardada</h3><div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">{selected.messages.map(message => <p key={message.id} className={`rounded-md p-2 text-xs ${message.role === 'user' ? 'bg-brand-50 text-brand-900' : 'bg-slate-50 text-slate-700'}`}><strong>{message.role === 'user' ? 'Consulta' : message.search ? 'Búsqueda jurídica' : 'Asistente Demo'}:</strong> {message.text}</p>)}</div></div>
        {selected.sources.length > 0 && <div><h3 className="font-semibold">Fuentes</h3>{selected.sources.map((source, index) => <p key={index}>{source.title}{source.url && <> · <a href={source.url} target="_blank" rel="noreferrer" className="text-brand-900 underline">Abrir fuente</a></>}</p>)}</div>}
        <p className="text-xs text-slate-500">Creada: {new Date(selected.createdAt).toLocaleString('es-BO')} · Actualizada: {new Date(selected.updatedAt).toLocaleString('es-BO')}</p>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        {canEdit && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Eliminar</button>{editing ? <><button type="button" onClick={() => setEditing(false)} className="rounded-md border border-slate-200 px-3 py-2 text-xs">Cancelar</button><button type="button" onClick={save} className="rounded-md bg-brand-900 px-3 py-2 text-xs font-semibold text-white">Guardar cambios</button></> : <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-900">Editar</button>}</div>}
      </div>}
    </Modal>
  </section>;
}
