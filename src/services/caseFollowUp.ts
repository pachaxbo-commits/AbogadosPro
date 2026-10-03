import type { Actividad, Caso, DocumentoCaso, Evento, Tarea } from '../types';
import { taskToday, validTaskDate } from './tasks';

type Movement = { fecha: string; descripcion: string };
export type FollowUpState = 'al-dia' | 'requiere' | 'sin' | 'concluido';

const toDay = (value: string, now: Date): string | null => {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : taskToday(parsed);
  return validTaskDate(day) && day <= taskToday(now) ? day : null;
};

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`);

export function caseFollowUp(caso: Caso, activities: Actividad[], documents: DocumentoCaso[], tasks: Tarea[], events: Evento[], now = new Date()) {
  const today = taskToday(now);
  const frequency = caso.seguimientoDias === undefined ? 30 : caso.seguimientoDias;
  const movements: Movement[] = [];
  const add = (value: string | undefined, descripcion: string) => {
    if (!value) return;
    const fecha = toDay(value, now);
    if (fecha) movements.push({ fecha, descripcion });
  };
  activities.forEach((item) => { if (item.casoId === caso.id) add(item.fecha, item.titulo === 'Seguimiento' ? 'Seguimiento registrado' : 'Actividad registrada'); });
  documents.forEach((item) => { if (item.casoId === caso.id) add(item.fechaCarga, 'Documento agregado'); });
  tasks.forEach((item) => { if (item.casoId === caso.id && item.estado === 'Completada') add(item.completedAt || item.updatedAt, 'Tarea completada'); });
  events.forEach((item) => {
    if (item.casoId === caso.id && (item.resultado?.tipo === 'Realizada' || (item.realizado && !item.resultado))) {
      add(item.resultado?.fecha || item.fecha, 'Evento realizado');
    }
  });
  movements.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lastMovement = movements[0] || null;
  const base = lastMovement?.fecha || toDay(caso.fechaCreacion, now) || today;
  const daysWithoutMovement = Math.max(0, Math.floor((dayNumber(today) - dayNumber(base)) / 86_400_000));
  const nextReview = frequency === null ? null : new Date(dayNumber(base) + frequency * 86_400_000).toISOString().slice(0, 10);
  const overdueDays = frequency === null || caso.estado === 'Concluido' ? 0 : Math.max(0, daysWithoutMovement - frequency);
  const state: FollowUpState = caso.estado === 'Concluido' ? 'concluido' : frequency === null ? 'sin' : overdueDays > 0 ? 'requiere' : 'al-dia';
  return { lastMovement, daysWithoutMovement, frequency, nextReview, overdueDays, state };
}
