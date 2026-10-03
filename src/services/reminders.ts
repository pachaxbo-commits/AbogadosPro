import type { Evento, RecordatorioEvento } from '../types';
import { eventState } from './eventResults';

const factors = { minutos: 1, horas: 60, días: 1440, semanas: 10080 };
export const reminderMinutes = (item: RecordatorioEvento) => item.cantidad * factors[item.unidad];
export const reminderLabel = (item: RecordatorioEvento) => `${item.cantidad} ${item.cantidad === 1 ? ({ minutos: 'minuto', horas: 'hora', días: 'día', semanas: 'semana' } as const)[item.unidad] : item.unidad} antes`;
export function validateReminders(items: RecordatorioEvento[]): RecordatorioEvento[] {
  if (items.length > 10) throw new Error('Puedes configurar hasta 10 recordatorios.');
  const seen = new Set<number>();
  return items.map(item => {
    const minutes = reminderMinutes(item);
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0 || !Number.isFinite(minutes) || minutes > 525600) throw new Error('Usa cantidades enteras positivas de hasta un año.');
    if (seen.has(minutes)) throw new Error('Hay recordatorios repetidos.');
    seen.add(minutes);
    return { ...item };
  });
}
export function configuredReminders(event?: Pick<Evento, 'hora' | 'recordatorios'>): RecordatorioEvento[] {
  if (!event) return [{ cantidad: 1, unidad: 'días' }, { cantidad: 1, unidad: 'horas' }];
  if (event.recordatorios?.personalizados) return event.recordatorios.personalizados;
  const items: RecordatorioEvento[] = [];
  if (event.recordatorios?.unDiaAntes) items.push({ cantidad: 1, unidad: 'días' });
  if (event.hora && event.recordatorios?.unaHoraAntes) items.push({ cantidad: 1, unidad: 'horas' });
  return items;
}
export function upcomingEventAlerts(events: Evento[], now: Date) {
  return events.flatMap(event => {
    if (eventState(event) !== 'Próximo' || event.resultado) return [];
    // Sin hora, el aviso toma como referencia el comienzo del día en Bolivia.
    const remaining = Date.parse(`${event.fecha}T${event.hora || '00:00'}:00-04:00`) - now.getTime();
    if (!Number.isFinite(remaining) || remaining < 0) return [];
    const due = configuredReminders(event).filter(item => remaining <= reminderMinutes(item) * 60000);
    if (!due.length) return [];
    const minutes = Math.ceil(remaining / 60000);
    const label = minutes === 0 ? 'ahora' : minutes < 60 ? `en ${minutes} min` : minutes < 1440 ? `en ${Math.floor(minutes / 60)} h ${minutes % 60} min` : `en ${Math.ceil(minutes / 1440)} días`;
    return [{ event, remaining, label: `${event.tipo}${event.tipo === 'Plazo' ? ' vence' : ''} ${label}`, noticeKey: `${event.id}:${event.fecha}:${event.hora || ''}:${Math.min(...due.map(reminderMinutes))}` }];
  }).sort((a, b) => a.remaining - b.remaining);
}
const seen = new Set<string>();
export function claimAlertNotice(scope: string, key: string): boolean {
  const storageKey = `abogadospro_alert:${encodeURIComponent(scope)}:${key}`;
  if (seen.has(storageKey)) return false;
  seen.add(storageKey);
  try {
    if (sessionStorage.getItem(storageKey)) return false;
    sessionStorage.setItem(storageKey, 'shown');
  } catch { /* Mantener deduplicación en memoria si el navegador bloquea almacenamiento. */ }
  return true;
}
