import type { DatosTarea, Tarea } from '../types';

const DAY = 86_400_000;
const HOUR = 3_600_000;

// Las tareas se interpretan en la zona del producto, independientemente del dispositivo.
export function taskToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function validTaskDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTask(data: DatosTarea, caseIds: readonly string[]): DatosTarea {
  if (!data.casoId || !caseIds.includes(data.casoId)) throw new Error('Selecciona un caso existente.');
  if (!data.titulo.trim()) throw new Error('Escribe el título de la tarea.');
  if (!validTaskDate(data.fechaLimite)) throw new Error('Ingresa una fecha límite válida.');
  if (data.horaLimite && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.horaLimite)) throw new Error('Ingresa una hora válida.');
  if (!['Alta', 'Media', 'Normal'].includes(data.prioridad)) throw new Error('Selecciona una prioridad válida.');
  return { casoId: data.casoId, encargadoId: data.encargadoId || '', titulo: data.titulo.trim(), fechaLimite: data.fechaLimite, prioridad: data.prioridad, descripcion: data.descripcion?.trim() || undefined, horaLimite: data.horaLimite || undefined };
}

export function readStoredTask(value: unknown): Tarea {
  if (!value || typeof value !== 'object') throw new Error('Tarea inválida');
  const item = value as Record<string, unknown>;
  for (const key of ['id', 'casoId', 'titulo', 'fechaLimite', 'prioridad', 'estado', 'createdAt', 'updatedAt']) {
    if (typeof item[key] !== 'string' || !item[key]) throw new Error('Tarea inválida');
  }
  for (const key of ['descripcion', 'horaLimite', 'completedAt', 'resultadoFinalizacion', 'encargadoId']) {
    if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error('Tarea inválida');
  }
  for (const key of ['createdAt', 'updatedAt', 'completedAt']) {
    if (item[key] !== undefined && !Number.isFinite(Date.parse(item[key] as string))) throw new Error('Fecha de auditoría inválida');
  }
  if (!['Pendiente', 'Completada'].includes(item.estado as string)) throw new Error('Estado inválido');
  const task = item as unknown as Tarea;
  validateTask(task, [task.casoId]);
  return task;
}

export type TaskTiming = { kind: 'completada' | 'vencida' | 'hoy' | 'proxima'; label: string; days: number };

export function taskTiming(task: Tarea, now: Date): TaskTiming {
  const today = taskToday(now);
  const days = Math.round((Date.parse(`${task.fechaLimite}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
  if (task.estado === 'Completada') return { kind: 'completada', label: 'Completada', days };
  // Bolivia usa UTC-04. Solo construir un instante cuando se indicó una hora.
  const delta = task.horaLimite ? Date.parse(`${task.fechaLimite}T${task.horaLimite}:00-04:00`) - now.getTime() : undefined;
  if (days < 0 || (delta !== undefined && delta < 0)) {
    const lateDays = delta === undefined ? -days : Math.floor(-delta / DAY);
    let label: string;
    if (lateDays >= 1) label = `${lateDays} ${lateDays === 1 ? 'día' : 'días'} de retraso`;
    else if (delta !== undefined && -delta >= HOUR) {
      const hours = Math.floor(-delta / HOUR);
      label = `${hours} ${hours === 1 ? 'hora' : 'horas'} de retraso`;
    } else label = 'Menos de una hora de retraso';
    return { kind: 'vencida', label, days };
  }
  if (delta !== undefined && delta < DAY) {
    const hours = Math.ceil(delta / HOUR);
    return { kind: days === 0 ? 'hoy' : 'proxima', label: delta < HOUR ? 'Vence en menos de una hora' : `Vence en ${hours} ${hours === 1 ? 'hora' : 'horas'}`, days };
  }
  if (days === 0) return { kind: 'hoy', label: 'Vence hoy', days };
  return { kind: 'proxima', label: days === 1 ? 'Vence mañana' : `Quedan ${days} días`, days };
}

export function sortTasks(tasks: readonly Tarea[], now: Date): Tarea[] {
  const rank = { vencida: 0, hoy: 1, proxima: 2, completada: 3 };
  const priority = { Alta: 0, Media: 1, Normal: 2 };
  return [...tasks].sort((a, b) => {
    const order = rank[taskTiming(a, now).kind] - rank[taskTiming(b, now).kind];
    if (order) return order;
    if (a.estado === 'Completada' && b.estado === 'Completada') return (b.completedAt || b.updatedAt).localeCompare(a.completedAt || a.updatedAt);
    return a.fechaLimite.localeCompare(b.fechaLimite) || priority[a.prioridad] - priority[b.prioridad]
      || (a.horaLimite || '').localeCompare(b.horaLimite || '') || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  });
}

export function urgentTasks(tasks: readonly Tarea[], now: Date): Tarea[] {
  return sortTasks(tasks.filter((task) => {
    if (task.estado !== 'Pendiente') return false;
    const timing = taskTiming(task, now);
    return timing.kind === 'vencida' || timing.kind === 'hoy' || (task.prioridad === 'Alta' && timing.days <= 7);
  }), now);
}
