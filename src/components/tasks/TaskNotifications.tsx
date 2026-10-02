import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { useTaskClock } from '../../hooks/useTaskClock';
import { taskTiming } from '../../services/tasks';
import { claimTaskNotice, taskNotifications } from '../../services/taskNotifications';

export function TaskNotifications() {
  const { tasks, tasksError, casesWithDetails, loading } = useLegalData();
  const now = useTaskClock();
  const { relevant, message, overdue } = taskNotifications(tasks, now);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const checked = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (loading || tasksError || checked.current) return;
    const timer = setTimeout(() => {
      checked.current = true;
      if (relevant.length && claimTaskNotice()) setToast(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [loading, tasksError, relevant.length]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 10000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); bell.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div ref={root} className="relative">
    <button ref={bell} type="button" aria-label={`Notificaciones${relevant.length ? `: ${relevant.length} tareas pendientes` : ''}`} aria-expanded={open} aria-controls={id} onClick={() => { setOpen((value) => !value); setToast(false); }} className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-200 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
      <Bell className="h-5 w-5" />{!tasksError && relevant.length > 0 && <span className="absolute -right-1 -top-0.5 min-w-4 rounded-full bg-amber-200 px-1 text-[10px] font-bold text-brand-950">{relevant.length}</span>}
    </button>
    {open && <section id={id} aria-label="Notificaciones" className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 z-50 mt-2 sm:w-80 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-sm">
      <h2 className="border-b border-slate-100 pb-2 text-sm font-bold">Notificaciones</h2>
      {tasksError ? <p role="alert" className="py-3 text-sm text-rose-700">{tasksError}</p> : loading ? <p className="py-3 text-sm">Cargando…</p> : relevant.length === 0 ? <p className="py-3 text-sm text-slate-500">No tienes tareas urgentes por ahora.</p> : <div className="max-h-80 overflow-y-auto">{relevant.slice(0, 5).map((task) => <Link key={task.id} to={`/tareas?caso=${encodeURIComponent(task.casoId)}`} onClick={() => setOpen(false)} className="block rounded-md border-b border-slate-100 p-2 hover:bg-brand-50">
        <span className="block break-words text-sm font-semibold">{task.titulo}</span><span className="mt-1 block truncate text-xs text-slate-500">{casesWithDetails.find((caso) => caso.id === task.casoId)?.nombre || 'Caso no disponible'}</span><span className={`mt-1 block text-xs ${taskTiming(task, now).kind === 'vencida' ? 'text-rose-700' : 'text-amber-800'}`}>{taskTiming(task, now).label}{task.prioridad !== 'Normal' && ` · ${task.prioridad}`}</span>
      </Link>)}</div>}
      <Link to="/tareas" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand-900 hover:underline">Ver todas las tareas →</Link>
    </section>}
    {toast && !tasksError && relevant.length > 0 && <div role="status" className={`task-notice fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-l-4 bg-white p-4 text-slate-900 shadow-md ${overdue ? 'border-rose-200 border-l-rose-500' : 'border-amber-200 border-l-amber-500'}`}>
      <button type="button" aria-label="Cerrar aviso de tareas" onClick={() => setToast(false)} className="float-right ml-2 rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      <AlertTriangle aria-hidden="true" className={`mb-2 h-5 w-5 ${overdue ? 'text-rose-600' : 'text-amber-600'}`} /><p className="text-sm font-semibold">{message}</p><p className="mt-1 text-xs text-slate-500">Revisa tus pendientes.</p><Link to="/tareas" onClick={() => setToast(false)} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-brand-900">Ver tareas →</Link>
    </div>}
  </div>;
}
