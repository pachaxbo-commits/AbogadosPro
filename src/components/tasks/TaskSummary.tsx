import { Link } from 'react-router-dom';
import { ListTodo, Plus } from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { useTaskClock } from '../../hooks/useTaskClock';
import { sortTasks, urgentTasks } from '../../services/tasks';
import { TaskList } from './TaskList';

export function TaskSummary({ casoId, onNewTask }: { casoId?: string; onNewTask?: () => void }) {
  const { tasks, tasksError, loading } = useLegalData();
  const now = useTaskClock();
  const selected = casoId ? sortTasks(tasks.filter((task) => task.casoId === casoId && task.estado === 'Pendiente'), now) : urgentTasks(tasks, now);
  return <section className="min-w-0 space-y-3" aria-label={casoId ? 'Tareas pendientes del caso' : 'Tareas pendientes'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><ListTodo className="h-5 w-5 shrink-0 text-brand-900" />{casoId ? `Tareas pendientes (${selected.length})` : 'Tareas pendientes'}</h2>
      {onNewTask && <button type="button" onClick={onNewTask} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-brand-900 hover:bg-brand-50"><Plus className="h-4 w-4" />Nueva tarea</button>}
    </div>
    {tasksError ? <p role="alert" className="text-sm text-rose-800">{tasksError}</p> : loading ? <p className="text-sm text-slate-500">Cargando tareas…</p> : <>
      {selected.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">{casoId ? 'No hay tareas pendientes para este caso.' : 'No tienes tareas urgentes.'}</p>}
      <TaskList tasks={selected.slice(0, casoId ? 3 : 4)} now={now} compact showCase={!casoId} />
    </>}
    <Link to={casoId ? `/tareas?caso=${encodeURIComponent(casoId)}` : '/tareas'} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-900 hover:underline">{casoId ? 'Ver todas →' : 'Ver todas las tareas →'}</Link>
  </section>;
}
