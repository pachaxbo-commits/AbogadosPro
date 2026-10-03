import type { Caso, Cliente, Evento } from '../types';
import { configuredReminders, reminderLabel } from './reminders';
import { eventState } from './eventResults';

// Se podrá sustituir por la configuración del estudio al incorporar usuarios.
export const CALENDAR_CONFIG = { timeZone: 'America/La_Paz', durationMinutes: 60 } as const;
export interface CalendarConfig { timeZone: string; durationMinutes: number }

export function eventReminders(event?: Pick<Evento, 'hora' | 'recordatorios'>): NonNullable<Evento['recordatorios']> {
  return {
    unDiaAntes: event?.recordatorios?.unDiaAntes ?? !event,
    unaHoraAntes: Boolean(event ? event.hora && event.recordatorios?.unaHoraAntes : true),
  };
}

export function canExportCalendar(event: Evento): boolean {
  return eventState(event) === 'Próximo' && !event.resultado;
}

export function calendarToday(now = new Date(), timeZone: string = CALENDAR_CONFIG.timeZone): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function toCalendarEvent(event: Evento, caso?: Caso, cliente?: Cliente, config: CalendarConfig = CALENDAR_CONFIG) {
  const date = new Date(`${event.fecha}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.fecha) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== event.fecha) throw new Error('La fecha del evento no es válida.');
  const time = event.hora?.trim();
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('La hora del evento no es válida.');
  const lines: string[] = [];
  const add = (label: string, value?: string) => { if (value?.trim()) lines.push(`${label}: ${value.trim()}`); };
  add('Caso', caso?.nombre);
  add('Cliente', cliente?.nombre);
  add('Tipo', event.tipo);
  add('Área', caso?.area);
  if (caso?.tipoIdentificacionJudicial) add(caso.tipoIdentificacionJudicial, caso.numeroIdentificacionJudicial);
  if (event.descripcion?.trim()) lines.push(`\nNotas:\n${event.descripcion.trim()}`);
  const reminders = configuredReminders(event);
  if (reminders.length) lines.push('\nRecordatorios a configurar en Google Calendar: ' + reminders.map(reminderLabel).join(', ') + '.');
  lines.push('\nGenerado desde AbogadosPro.');

  // Aritmética de calendario en UTC, sin convertir la hora civil a la zona del dispositivo.
  // Los valores enviados no llevan Z: Google recibe explícitamente su zona IANA.
  const start = new Date(`${event.fecha}T${time || '00:00'}:00Z`);
  const end = new Date(start.getTime() + (time ? config.durationMinutes : 1440) * 60_000);
  const format = (value: Date) => time ? value.toISOString().slice(0, 19).replace(/[-:]/g, '') : value.toISOString().slice(0, 10).replace(/-/g, '');
  return { title: event.titulo, description: lines.join('\n').trim(), location: event.juzgado?.trim() || undefined, start: format(start), end: format(end), allDay: !time, timeZone: config.timeZone };
}

// Enlace de creación de Google; no usa API, tokens ni persiste un estado de sincronización.
export function googleCalendarUrl(event: Evento, caso?: Caso, cliente?: Cliente, config: CalendarConfig = CALENDAR_CONFIG): string {
  const calendar = toCalendarEvent(event, caso, cliente, config);
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');
  url.search = new URLSearchParams({ action: 'TEMPLATE', text: calendar.title, dates: `${calendar.start}/${calendar.end}`, details: calendar.description, ctz: calendar.timeZone, stz: calendar.timeZone, etz: calendar.timeZone }).toString();
  if (calendar.location) url.searchParams.set('location', calendar.location);
  return url.toString();
}

// Debe llamarse sin await previo, dentro del gesto del usuario.
export function openCalendarWindow(url?: string): Window {
  const popup = window.open(url || 'about:blank', '_blank');
  if (!popup) throw new Error('El navegador bloqueó la pestaña. Permite ventanas emergentes para AbogadosPro y vuelve a intentarlo.');
  popup.opener = null;
  if (!url) {
    popup.document.title = 'Preparando Google Calendar';
    popup.document.body.textContent = 'Guardando el evento en AbogadosPro…';
  }
  return popup;
}
