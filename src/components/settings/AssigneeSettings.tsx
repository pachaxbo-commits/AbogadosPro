import { useState, type FormEvent } from 'react';
import { ChevronDown, Plus, Search, Users } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useProfile } from '../../context/ProfileContext';
import type { Assignee, AssigneeInput } from '../../types/assignee';

const emptyForm: AssigneeInput = { nombre: '', telefono: '', correo: '', estado: 'Activo' };
const fieldClass = 'mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-900 focus:outline-hidden focus:ring-1 focus:ring-brand-900';

export function AssigneeSettings() {
  const { assignees, assigneesError, addAssignee, updateAssignee } = useProfile();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Assignee | null>(null);
  const [form, setForm] = useState<AssigneeInput>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeCount = assignees.filter((item) => item.estado === 'Activo').length;
  const term = query.trim().toLocaleLowerCase('es');
  const visible = assignees.filter((item) => [item.nombre, item.telefono, item.correo].some((value) => value.toLocaleLowerCase('es').includes(term)));

  const openForm = (item: Assignee | null) => {
    setEditing(item);
    setForm(item ? { nombre: item.nombre, telefono: item.telefono, correo: item.correo, estado: item.estado } : { ...emptyForm });
    setError('');
    setMessage('');
    setModalOpen(true);
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (editing) updateAssignee(editing.id, form);
      else addAssignee(form);
      setModalOpen(false);
      setError('');
      setMessage(editing ? 'Encargado actualizado.' : 'Encargado agregado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el encargado.'); }
  };
  const toggleStatus = (item: Assignee) => {
    try {
      updateAssignee(item.id, { nombre: item.nombre, telefono: item.telefono, correo: item.correo, estado: item.estado === 'Activo' ? 'Inactivo' : 'Activo' });
      setError('');
      setMessage(item.estado === 'Activo' ? 'Encargado desactivado. Sus datos se conservaron.' : 'Encargado activado.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el encargado.'); }
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="settings-assignees">
    <h2 id="settings-assignees" className="flex items-center gap-2 text-lg font-semibold text-brand-900"><Users className="h-5 w-5" />Encargados</h2>
    <p className="mt-1 text-sm text-slate-500">Administra las personas que pueden ser responsables de casos o tareas.</p>
    <div className="mt-4 rounded-md border border-slate-200">
      <button type="button" aria-expanded={expanded} aria-controls="settings-assignees-content" onClick={() => setExpanded((value) => !value)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-brand-50">
        <span><span className="block text-sm font-semibold text-slate-800">Encargados <span className="font-normal text-slate-500">· {activeCount} {activeCount === 1 ? 'activo' : 'activos'}</span></span><span className="mt-0.5 block text-xs text-slate-500">Gestiona ayudantes y colaboradores.</span></span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div id="settings-assignees-content" className="border-t border-slate-100 p-3">
        {assigneesError ? <p role="alert" className="text-sm text-rose-700">{assigneesError}</p> : <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 px-3 focus-within:border-brand-900"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input type="search" aria-label="Buscar encargados" placeholder="Buscar por nombre, teléfono o correo" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent text-sm focus:outline-hidden" /></label>
            <button type="button" onClick={() => openForm(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-brand-900 px-3 text-sm font-semibold text-white hover:bg-brand-800"><Plus className="h-4 w-4" />Agregar encargado</button>
          </div>
          {error && !modalOpen && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
          {message && <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}
          {visible.length ? <ul className="mt-3 divide-y divide-slate-100">{visible.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-800">{item.nombre}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${item.estado === 'Activo' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{item.estado}</span></div><p className="mt-0.5 break-words text-xs text-slate-500">{[item.telefono, item.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p></div>
            <div className="flex shrink-0 gap-2"><button type="button" onClick={() => openForm(item)} className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-brand-900 hover:bg-brand-50">Editar</button><button type="button" onClick={() => toggleStatus(item)} className="min-h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-brand-900 hover:bg-brand-50">{item.estado === 'Activo' ? 'Desactivar' : 'Activar'}</button></div>
          </li>)}</ul> : <p className="py-5 text-center text-sm text-slate-500">{term ? 'No se encontraron encargados.' : 'Todavía no hay encargados registrados.'}</p>}
        </>}
      </div>}
    </div>
    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar encargado' : 'Agregar encargado'} subtitle="Persona del estudio; no es un usuario de AbogadosPro.">
      <form onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Nombre completo *<input autoFocus required maxLength={120} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} className={fieldClass} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Teléfono<input type="tel" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} className={fieldClass} /></label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Correo electrónico<input type="email" value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })} className={fieldClass} /></label>
        {editing && <label className="block text-xs font-semibold uppercase tracking-wide text-slate-700">Estado<select value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value as AssigneeInput['estado'] })} className={fieldClass}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="min-h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-brand-900 hover:bg-brand-50">Cancelar</button><button type="submit" className="min-h-10 rounded-md bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-800">{editing ? 'Guardar cambios' : 'Guardar encargado'}</button></div>
      </form>
    </Modal>
  </section>;
}
