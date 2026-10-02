import type { DatosResultadoEvento, Evento } from '../types';
import { taskToday, validTaskDate } from './tasks';

export const EVENT_RESULTS = ['Realizada', 'Suspendida', 'Reprogramada', 'Cancelada', 'Otro'] as const;
export function eventState(event: Evento) {
  return event.estado || (event.realizado ? 'Realizado' : 'Próximo');
}
export function eventHasPassed(event: Pick<Evento, 'fecha' | 'hora'>, now: Date): boolean {
  return event.hora ? Date.parse(`${event.fecha}T${event.hora}:00-04:00`) < now.getTime() : event.fecha < taskToday(now);
}
export function pendingEventResult(event: Evento, now: Date): boolean {
  return !event.resultado && eventState(event) !== 'Cancelado' && eventHasPassed(event, now);
}

// Produce una sola escritura del conjunto de eventos: original y nueva cita son atómicos.
export function applyEventResult(events: Evento[], casoId: string, id: string, data: DatosResultadoEvento, now: Date): Evento[] {
  const original = events.find((event) => event.id === id && event.casoId === casoId);
  if (!original) throw new Error('El evento no pertenece a este caso o ya no existe.');
  if (!EVENT_RESULTS.includes(data.tipo)) throw new Error('Selecciona un resultado.');
  if (!data.observaciones.trim()) throw new Error('Describe el resultado de la actuación.');
  if (!validTaskDate(data.fecha)) throw new Error('Ingresa una fecha de resultado válida.');
  const previous = original.resultado;
  let linkedId = previous?.eventoReprogramadoId;
  let linked = linkedId ? events.find((event) => event.id === linkedId && event.casoId === casoId && event.eventoOrigenId === id) : undefined;
  if (linkedId && !linked) throw new Error('No se encontró el evento reprogramado.');
  const scheduleChanged = data.tipo === 'Reprogramada' && (previous?.tipo !== 'Reprogramada' || data.nuevaFecha !== previous.nuevaFecha || (data.nuevaHora || '') !== (previous.nuevaHora || ''));
  if (data.tipo === 'Reprogramada') {
    if (!data.nuevaFecha || !validTaskDate(data.nuevaFecha)) throw new Error('Ingresa una nueva fecha válida.');
    if (data.nuevaHora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.nuevaHora)) throw new Error('Ingresa una nueva hora válida.');
    if (scheduleChanged && (data.nuevaFecha < taskToday(now) || (data.nuevaHora && Date.parse(`${data.nuevaFecha}T${data.nuevaHora}:00-04:00`) <= now.getTime()))) throw new Error('La nueva fecha y hora deben ser futuras.');
    if (!linked) {
      linkedId = `ev-${crypto.randomUUID()}`;
      linked = { id: linkedId, casoId, tipo: original.tipo, titulo: original.titulo, fecha: data.nuevaFecha, hora: data.nuevaHora || undefined, juzgado: original.juzgado, descripcion: original.descripcion, eventoOrigenId: id, estado: 'Próximo', realizado: false };
    } else if (scheduleChanged) {
      if (linked.resultado || linked.realizado) throw new Error('El nuevo evento ya fue cerrado; solo puedes corregir las observaciones del resultado original.');
      linked = { ...linked, fecha: data.nuevaFecha, hora: data.nuevaHora || undefined, estado: 'Próximo', realizado: false };
    }
  } else if (previous?.tipo === 'Reprogramada' && linked) {
    if (linked.resultado || linked.realizado) throw new Error('El evento reprogramado ya fue cerrado; conserva el resultado original y corrige sus observaciones.');
    // Corregir una reprogramación no borra la cita creada: queda cancelada en el historial.
    linked = { ...linked, estado: 'Cancelado' };
  }
  const stamp = now.toISOString();
  const updated: Evento = { ...original, estado: data.tipo === 'Cancelada' ? 'Cancelado' : 'Realizado', realizado: data.tipo !== 'Cancelada', resultado: {
    tipo: data.tipo, observaciones: data.observaciones.trim(), proximosPasos: data.proximosPasos?.trim() || undefined, fecha: data.fecha,
    nuevaFecha: data.tipo === 'Reprogramada' ? data.nuevaFecha : undefined, nuevaHora: data.tipo === 'Reprogramada' ? data.nuevaHora || undefined : undefined,
    registradoEn: previous?.registradoEn || stamp, actualizadoEn: stamp, eventoReprogramadoId: linkedId,
  } };
  const next = events.map((event) => event.id === id ? updated : linked && event.id === linked.id ? linked : event);
  if (linked && !events.some((event) => event.id === linked.id)) next.push(linked);
  return next;
}
