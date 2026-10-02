import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { taskTiming } from '../../services/tasks';
import { formatFecha } from '../../services/formatters';
import { Modal } from '../common/Modal';
import { TaskFormModal } from './TaskFormModal';
import type { Tarea } from '../../types';

const button = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50 transition-colors disabled:opacity-50';
const priorityStyle = { Alta: 'border-rose-200 text-rose-800 bg-rose-50', Media: 'border-amber-200 text-amber-800 bg-amber-50', Normal: 'border-slate-200 text-slate-600 bg-slate-50' };

export function TaskList({ tasks, now, compact = false, showCase = true }: { tasks: Tarea[]; now: Date; compact?: boolean; showCase?: boolean }) {
  const { casesWithDetails, setTaskStatus, deleteTask } = useLegalData();
  const [editing, setEditing] = useState<Tarea | null>(null);
  const [deleting, setDeleting] = useState<Tarea | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const caseMap = new Map(casesWithDetails.map((caso) => [caso.id, caso]));
  const act = async (action: () => Promise<unknown>, success: string) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage(''); setError('');
    try { await action(); setMessage(success); setDeleting(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar la tarea.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <div className="space-y-3">
    {message && <p role="status" className="rounded-md border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">{message}</p>}
    {error && !deleting && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    {tasks.map((task) => {
      const timing = taskTiming(task, now);
      const caso = caseMap.get(task.casoId);
      const complete = task.estado === 'Completada';
      return <article key={task.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-xs" aria-label={task.titulo}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{task.titulo}</h3>
          <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${priorityStyle[task.prioridad]}`}>{task.prioridad}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={`font-semibold ${timing.kind === 'vencida' ? 'text-rose-800' : timing.kind === 'hoy' ? 'text-amber-800' : complete ? 'text-emerald-800' : 'text-slate-600'}`}>{timing.label}</span>
          <span className="text-slate-500">{formatFecha(task.fechaLimite)}{task.horaLimite && ` · ${task.horaLimite}`}</span>
        </div>
        {showCase && <p className="mt-2 break-words text-xs text-slate-600 [overflow-wrap:anywhere]">{caso?.nombre || 'Caso no disponible'}{!compact && caso && <span className="mt-1 block text-slate-500">{caso.clienteNombre}</span>}</p>}
        {!compact && task.descripcion && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600 [overflow-wrap:anywhere]">{task.descripcion}</p>}
        {!compact && complete && task.completedAt && <p className="mt-2 text-xs text-slate-500">Finalizada: {new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'short', timeStyle: 'short' }).format(new Date(task.completedAt))}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} className={button} onClick={() => void act(() => setTaskStatus(task.id, complete ? 'Pendiente' : 'Completada'), complete ? 'Tarea reabierta correctamente.' : 'Tarea completada correctamente.')}>
            {complete ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{complete ? 'Reabrir tarea' : 'Completar'}
          </button>
          {!compact && <>
            <button type="button" className={button} disabled={busy} onClick={() => setEditing(task)}><Pencil className="h-3.5 w-3.5" />Editar</button>
            <button type="button" className={button} disabled={busy} onClick={() => { setError(''); setDeleting(task); }}><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
          </>}
          {showCase && caso && <Link to={`/casos/${task.casoId}`} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-brand-900 hover:underline">Ver caso →</Link>}
          {compact && <Link to={`/tareas?caso=${encodeURIComponent(task.casoId)}`} className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-brand-900 hover:underline">Ver tareas →</Link>}
        </div>
      </article>;
    })}
    {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSuccess={() => { setMessage('Tarea actualizada correctamente.'); setError(''); }} />}
    {deleting && <Modal isOpen title="¿Eliminar esta tarea?" onClose={() => { if (!busyRef.current) setDeleting(null); }} maxWidth="sm">
      <p className="break-words text-sm font-semibold text-slate-900">{deleting.titulo}</p>
      <p className="mt-2 text-sm text-slate-600">Esta acción elimina el registro de la tarea. No se podrá deshacer.</p>
      {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} className={button} onClick={() => setDeleting(null)}>Cancelar</button>
        <button type="button" disabled={busy} className="min-h-11 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50" onClick={() => void act(() => deleteTask(deleting.id), 'Tarea eliminada correctamente.')}>{busy ? 'Eliminando…' : 'Eliminar tarea'}</button>
      </div>
    </Modal>}
  </div>;
}
