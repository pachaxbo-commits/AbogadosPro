import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { googleCalendarUrl, toCalendarEvent, canExportCalendar, eventReminders, calendarToday } = require('../node_modules/.tmp/task-tests/services/calendarService.js');
const { LocalStorageLegalRepository } = require('../node_modules/.tmp/task-tests/repositories/localStorageRepo.js');
const { openCalendarWindow } = require('../node_modules/.tmp/task-tests/services/calendarService.js');
const event = { id: 'calendar-test', casoId: 'cas-1', tipo: 'Audiencia', titulo: 'Audiencia & revisión', fecha: '2026-10-10', hora: '15:30', descripcion: 'Notas con ñ y &.', juzgado: 'Sala 2' };
const caso = { nombre: 'Caso de prueba', area: 'Penal', tipoIdentificacionJudicial: 'CUD', numeroIdentificacionJudicial: '12345' };
const client = { nombre: 'Cliente de prueba' };

test('Apertura: gesto síncrono, nueva pestaña, reserva visible y bloqueo explícito', () => {
  const calls = [];
  const popup = { opener: {}, document: { title: '', body: { textContent: '' } } };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { open: (...args) => { calls.push(args); return popup; } } });
  assert.equal(openCalendarWindow('https://calendar.google.com/calendar/r/eventedit'), popup);
  assert.deepEqual(calls[0], ['https://calendar.google.com/calendar/r/eventedit', '_blank']);
  assert.equal(popup.opener, null);
  openCalendarWindow();
  assert.deepEqual(calls[1], ['about:blank', '_blank']);
  assert.match(popup.document.body.textContent, /Guardando el evento/);
  window.open = () => null;
  assert.throws(() => openCalendarWindow(), /bloqueó la pestaña/);
  delete globalThis.window;
});

test('Calendar: datos reales, codificación, hora civil, zona y 60 minutos sin mutar el evento', () => {
  const original = structuredClone(event);
  const url = new URL(googleCalendarUrl(event, caso, client));
  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), event.titulo);
  assert.equal(url.searchParams.get('dates'), '20261010T153000/20261010T163000');
  for (const key of ['ctz', 'stz', 'etz']) assert.equal(url.searchParams.get(key), 'America/La_Paz');
  assert.equal(url.searchParams.get('location'), 'Sala 2');
  for (const text of ['Caso: Caso de prueba', 'Cliente: Cliente de prueba', 'Tipo: Audiencia', 'Área: Penal', 'CUD: 12345', event.descripcion]) assert.ok(url.searchParams.get('details').includes(text));
  assert.deepEqual(event, original);
});

test('Calendar: día completo, fin exclusivo, cambio de año y ausencia de campos vacíos', () => {
  const allDay = toCalendarEvent({ ...event, fecha: '2026-12-31', hora: undefined, juzgado: undefined, descripcion: undefined });
  assert.equal(allDay.start, '20261231');
  assert.equal(allDay.end, '20270101');
  assert.equal(allDay.allDay, true);
  assert.doesNotMatch(allDay.description, /undefined|null|Caso:|Cliente:|Notas:/);
  const timed = toCalendarEvent({ ...event, fecha: '2026-12-31', hora: '23:30' });
  assert.equal(timed.end, '20270101T003000');
  const url = new URL(googleCalendarUrl({ ...event, juzgado: undefined }, { ...caso, tipoIdentificacionJudicial: 'NUREJ' }));
  assert.equal(url.searchParams.has('location'), false);
  assert.match(url.searchParams.get('details'), /NUREJ: 12345/);
});

test('Calendar: independiente de la zona del dispositivo y configuración central sustituible', () => {
  const oldZone = process.env.TZ;
  try {
    process.env.TZ = 'Pacific/Auckland';
    const first = googleCalendarUrl(event);
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(googleCalendarUrl(event), first);
    assert.equal(calendarToday(new Date('2026-10-03T02:00:00Z')), '2026-10-02');
    const custom = toCalendarEvent(event, undefined, undefined, { timeZone: 'America/Bogota', durationMinutes: 30 });
    assert.equal(custom.end, '20261010T160000');
    assert.equal(custom.timeZone, 'America/Bogota');
  } finally { if (oldZone === undefined) delete process.env.TZ; else process.env.TZ = oldZone; }
});

test('Calendar: cerrados ocultos, nueva cita reprogramada exportable y fechas inválidas rechazadas', () => {
  assert.equal(canExportCalendar(event), true);
  for (const patch of [{ realizado: true }, { estado: 'Cancelado' }, { resultado: { tipo: 'Reprogramada' } }, { resultado: { tipo: 'Realizada' } }]) assert.equal(canExportCalendar({ ...event, ...patch }), false);
  assert.equal(canExportCalendar({ ...event, eventoOrigenId: 'original', estado: 'Próximo', realizado: false }), true);
  for (const patch of [{ fecha: '2026-02-30' }, { hora: '25:00' }]) assert.throws(() => googleCalendarUrl({ ...event, ...patch }));
});

test('Recordatorios: valores iniciales, compatibilidad y sin aviso horario para día completo', () => {
  assert.deepEqual(eventReminders(), { unDiaAntes: true, unaHoraAntes: true });
  assert.deepEqual(eventReminders(event), { unDiaAntes: false, unaHoraAntes: false });
  assert.deepEqual(eventReminders({ hora: undefined, recordatorios: { unDiaAntes: true, unaHoraAntes: true } }), { unDiaAntes: true, unaHoraAntes: false });
});

test('Recordatorios: creación, edición y recarga con el repositorio actual', async () => {
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  const repo = new LocalStorageLegalRepository();
  const { id, ...data } = event;
  const created = await repo.addEvent({ ...data, recordatorios: eventReminders() });
  let reloaded = (await new LocalStorageLegalRepository().getEvents()).find(item => item.id === created.id);
  assert.deepEqual(reloaded.recordatorios, { unDiaAntes: true, unaHoraAntes: true });
  await repo.updateEvent(created.id, { ...data, recordatorios: { unDiaAntes: false, unaHoraAntes: true } });
  reloaded = (await new LocalStorageLegalRepository().getEvents()).find(item => item.id === created.id);
  assert.deepEqual(reloaded.recordatorios, { unDiaAntes: false, unaHoraAntes: true });
  assert.equal((await repo.getEvents()).filter(item => item.id === created.id).length, 1);
});
