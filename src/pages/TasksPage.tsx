import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListTodo, Plus, Search } from 'lucide-react';
import { useLegalData } from '../context/LegalDataContext';
import { useProfile } from '../context/ProfileContext';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskList } from '../components/tasks/TaskList';
import { useTaskClock } from '../hooks/useTaskClock';
import { sortTasks, taskTiming, taskToday } from '../services/tasks';
import type { PrioridadTarea } from '../types';
import { matchesCaseSearch, normalizeSearch } from '../services/caseSearch';

const filters = ['Pendientes', 'Hoy', 'Vencidas', 'Completadas'] as const;
type Filter = typeof filters[number];
export function TasksPage() {
  const { tasks, tasksError, casesWithDetails, loading } = useLegalData();
  const { assignees } = useProfile();
  const [params, setParams] = useSearchParams();
  const casoId = params.get('caso') || '';
  const [filter, setFilter] = useState<Filter>('Pendientes');
  const [priority, setPriority] = useState<PrioridadTarea | ''>('');
  const [encargadoId, setEncargadoId] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const now = useTaskClock();
  const term = normalizeSearch(search);
  const caseMap = new Map(casesWithDetails.map((caso) => [caso.id, caso]));
  const candidates = tasks.filter((task) => {
    const caso = caseMap.get(task.casoId);
    return (!casoId || task.casoId === casoId) && (!priority || task.prioridad === priority)
      && (!encargadoId || (encargadoId === '__unassigned__' ? !task.encargadoId : task.encargadoId === encargadoId))
      && (!term || normalizeSearch(task.titulo).includes(term) || matchesCaseSearch(caso, term));
  });
  const matches = (task: typeof tasks[number], value: Filter) => {
    if (value === 'Completadas') return task.estado === 'Completada';
    if (task.estado !== 'Pendiente') return false;
    return value === 'Pendientes' || (value === 'Hoy' ? task.fechaLimite === taskToday(now) : taskTiming(task, now).kind === 'vencida');
  };
  const visible = sortTasks(candidates.filter((task) => matches(task, filter)), now);
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-slate-900">Tareas</h1><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" aria-label="Tareas pendientes">{tasks.filter((task) => task.estado === 'Pendiente').length}</span></div>
        <p className="mt-1 text-xs text-slate-500">Seguimiento de pendientes y vencimientos de todos los casos</p></div>
      <button type="button" onClick={() => { setSuccess(''); setCreating(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"><Plus className="h-4 w-4" />Nueva tarea</button>
    </div>
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap gap-2" aria-label="Estado de las tareas">
        {filters.map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? 'bg-brand-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{value} ({candidates.filter((task) => matches(task, value)).length})</button>)}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-4">
        <label className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 md:col-span-2"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input aria-label="Buscar tareas" placeholder="Buscar tarea, caso, cliente, NUREJ o CUD..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full min-w-0 py-2 text-sm outline-none" /></label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">Prioridad<select aria-label="Prioridad" value={priority} onChange={(e) => setPriority(e.target.value as PrioridadTarea | '')} className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="">Todas</option><option>Alta</option><option>Media</option><option>Normal</option></select></label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">Encargado<select aria-label="Filtrar tareas por encargado" value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-sm"><option value="">Todos</option><option value="__unassigned__">Sin encargado</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.estado === 'Inactivo' ? ' (inactivo)' : ''}</option>)}</select></label>
      </div>
      {casoId && <p className="text-xs text-slate-600">Tareas de: {caseMap.get(casoId)?.nombre || 'Caso no disponible'} <button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('caso'); setParams(next); }} className="ml-2 min-h-9 font-semibold text-brand-900 hover:underline">Ver todas las tareas →</button></p>}
    </div>
    {success && <p role="status" className="text-sm text-brand-900">{success}</p>}
    {tasksError ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{tasksError}</p> : loading ? <p className="text-sm text-slate-500">Cargando tareas…</p> : <>
      {visible.length === 0 && <div className="rounded-lg border border-slate-200 bg-white p-8 text-center"><ListTodo className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-600">{term || priority || casoId || encargadoId ? 'No hay tareas para estos filtros.' : filter === 'Pendientes' ? 'No tienes tareas pendientes.' : filter === 'Hoy' ? 'No tienes tareas para hoy.' : filter === 'Vencidas' ? 'No tienes tareas vencidas.' : 'No hay tareas completadas.'}</p><button type="button" onClick={() => setCreating(true)} className="mt-3 min-h-11 rounded-md px-3 text-sm font-semibold text-brand-900 hover:bg-brand-50">+ Nueva tarea</button></div>}
      <TaskList tasks={visible} now={now} />
    </>}
    {creating && <TaskFormModal casoId={caseMap.has(casoId) ? casoId : undefined} onClose={() => setCreating(false)} onSuccess={() => setSuccess('Tarea creada correctamente.')} />}
  </div>;
}
