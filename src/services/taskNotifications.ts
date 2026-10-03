import type { Tarea } from '../types';
import { sortTasks, taskTiming } from './tasks';

export function taskNotifications(tasks: readonly Tarea[], now: Date) {
  const relevant = sortTasks(tasks.filter((task) => task.estado === 'Pendiente' && (['vencida', 'hoy'].includes(taskTiming(task, now).kind) || (task.horaLimite && Date.parse(`${task.fechaLimite}T${task.horaLimite}:00-04:00`) - now.getTime() <= 86400000))), now);
  const overdue = relevant.filter((task) => taskTiming(task, now).kind === 'vencida').length;
  const today = relevant.length - overdue;
  const message = today && overdue ? `Tienes ${today} ${today === 1 ? 'tarea' : 'tareas'} para hoy y ${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}.`
    : overdue ? `Tienes ${overdue} ${overdue === 1 ? 'tarea vencida' : 'tareas vencidas'}.`
    : `Tienes ${today} ${today === 1 ? 'tarea' : 'tareas'} para hoy.`;
  return { relevant, overdue, today, message };
}

let shownInMemory = false;
export function claimTaskNotice(): boolean {
  if (shownInMemory) return false;
  shownInMemory = true;
  try {
    if (sessionStorage.getItem('abogadospro_task_notice_v1')) return false;
    sessionStorage.setItem('abogadospro_task_notice_v1', 'shown');
  } catch { /* Navegadores sin sessionStorage: conservar el control durante esta carga. */ }
  return true;
}
