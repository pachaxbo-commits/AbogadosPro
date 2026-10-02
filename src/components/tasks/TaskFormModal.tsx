import { useCallback, useId, useRef, useState } from 'react';
import { CaseSearchSelect } from '../common/CaseSearchSelect';
import { searchCases } from '../../services/caseSearch';
import { Modal } from '../common/Modal';
import { useLegalData } from '../../context/LegalDataContext';
import { validateTask } from '../../services/tasks';
import type { DatosTarea, PrioridadTarea, Tarea } from '../../types';

const field = 'mt-1 w-full min-w-0 min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-900';
const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700';

export function TaskFormModal({ onClose, onSuccess, task, casoId }: {
  onClose: () => void; onSuccess?: () => void; task?: Tarea; casoId?: string;
}) {
  const { cases, casesWithDetails, addTask, updateTask } = useLegalData();
  const findCases = useCallback(async (query: string, limit: number) => searchCases(casesWithDetails, query, limit), [casesWithDetails]);
  const id = useId();
  const [data, setData] = useState<DatosTarea>(() => ({
    casoId: task?.casoId || casoId || '', titulo: task?.titulo || '',
    fechaLimite: task?.fechaLimite || '', horaLimite: task?.horaLimite || '',
    prioridad: task?.prioridad || 'Normal', descripcion: task?.descripcion || '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const change = (patch: Partial<DatosTarea>) => { setData((previous) => ({ ...previous, ...patch })); setError(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    try {
      const clean = validateTask(data, cases.map((caso) => caso.id));
      busy.current = true; setSaving(true); setError('');
      if (task) await updateTask(task.id, clean);
      else await addTask(clean);
      onSuccess?.(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la tarea.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal isOpen onClose={() => { if (!busy.current) onClose(); }} title={task ? 'Editar tarea' : 'Nueva tarea'} maxWidth="lg">
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {cases.length === 0 && <p className="text-sm text-slate-600">Crea un caso antes de registrar una tarea.</p>}
      <div><label className={label} htmlFor={`${id}-case`}>Caso asociado *</label>
        <CaseSearchSelect id={`${id}-case`} selected={casesWithDetails.find((caso) => caso.id === data.casoId)} onSelect={(casoId) => change({ casoId })} search={findCases} />
      </div>
      <div><label className={label} htmlFor={`${id}-title`}>Título de la tarea *</label>
        <input id={`${id}-title`} required className={field} value={data.titulo} onChange={(e) => change({ titulo: e.target.value })} placeholder="Ej: Preparar memorial" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0"><label className={label} htmlFor={`${id}-date`}>Fecha límite *</label>
          <input id={`${id}-date`} type="date" required className={field} value={data.fechaLimite} onChange={(e) => change({ fechaLimite: e.target.value })} />
        </div>
        <div className="min-w-0"><label className={label} htmlFor={`${id}-time`}>Hora (opcional)</label>
          <input id={`${id}-time`} type="time" className={field} value={data.horaLimite} onChange={(e) => change({ horaLimite: e.target.value })} />
        </div>
      </div>
      <div><label className={label} htmlFor={`${id}-priority`}>Prioridad *</label>
        <select id={`${id}-priority`} required className={field} value={data.prioridad} onChange={(e) => change({ prioridad: e.target.value as PrioridadTarea })}>
          <option>Normal</option><option>Media</option><option>Alta</option>
        </select>
      </div>
      <div><label className={label} htmlFor={`${id}-notes`}>Notas / Descripción (opcional)</label>
        <textarea id={`${id}-notes`} rows={3} className={field} value={data.descripcion} onChange={(e) => change({ descripcion: e.target.value })} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
        <button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={saving || cases.length === 0} className="min-h-11 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}</button>
      </div>
    </form>
  </Modal>;
}
