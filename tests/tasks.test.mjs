import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { taskTiming, taskToday, sortTasks, urgentTasks, validTaskDate, validateTask } = require('../node_modules/.tmp/task-tests/services/tasks.js');
const { LocalStorageLegalRepository } = require('../node_modules/.tmp/task-tests/repositories/localStorageRepo.js');
const now = new Date('2026-10-02T16:00:00Z'); // Mediodía en Bolivia.
const draft = { casoId: 'cas-1', titulo: 'Preparar memorial', fechaLimite: '2026-10-02', prioridad: 'Normal' };
const task = (extra = {}) => ({ ...draft, id: 't1', estado: 'Pendiente', createdAt: now.toISOString(), updatedAt: now.toISOString(), ...extra });
const key = 'abogadospro_tasks_v1';
function storage() {
  const values = new Map();
  const store = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
  return { store, values };
}

test('fechas reales: bisiestos, fechas imposibles y campos obligatorios', () => {
  assert.equal(validTaskDate('2024-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', '', '02/10/2026']) assert.equal(validTaskDate(value), false);
  for (const patch of [{ casoId: '' }, { casoId: 'inexistente' }, { titulo: '  ' }, { fechaLimite: '' }, { horaLimite: '24:01' }, { prioridad: 'Urgente' }]) assert.throws(() => validateTask({ ...draft, ...patch }, ['cas-1']));
  assert.equal(validateTask({ ...draft, titulo: '  Revisar  ' }, ['cas-1']).titulo, 'Revisar');
});

test('sin hora: permanece hoy hasta cambiar la fecha de Bolivia', () => {
  const late = new Date('2026-10-03T03:59:59Z');
  assert.equal(taskToday(late), '2026-10-02');
  assert.equal(taskTiming(task(), late).label, 'Vence hoy');
  assert.equal(taskTiming(task(), new Date('2026-10-03T04:00:00Z')).label, '1 día de retraso');
  assert.equal(taskTiming(task({ fechaLimite: '2026-10-03' }), now).label, 'Vence mañana');
  assert.equal(taskTiming(task({ fechaLimite: '2026-10-07' }), now).label, 'Quedan 5 días');
});

test('hora explícita: horas restantes, minutos y atraso, incluido cruce de medianoche', () => {
  assert.equal(taskTiming(task({ horaLimite: '15:00' }), now).label, 'Vence en 3 horas');
  assert.equal(taskTiming(task({ horaLimite: '12:30' }), now).label, 'Vence en menos de una hora');
  assert.equal(taskTiming(task({ horaLimite: '11:00' }), now).label, '1 hora de retraso');
  assert.equal(taskTiming(task({ horaLimite: '11:59' }), now).kind, 'vencida');
  assert.equal(taskTiming(task({ fechaLimite: '2026-10-01', horaLimite: '23:00' }), new Date('2026-10-02T04:30:00Z')).label, '1 hora de retraso');
  assert.equal(taskTiming(task({ fechaLimite: '2026-09-29', horaLimite: '12:00' }), now).label, '3 días de retraso');
});

test('completadas no aparecen como vencidas; orden y selección para Inicio', () => {
  const completed = task({ id: 'done', estado: 'Completada', fechaLimite: '2026-09-01', completedAt: now.toISOString() });
  assert.equal(taskTiming(completed, now).kind, 'completada');
  const list = [completed, task({ id: 'future', fechaLimite: '2026-10-04' }), task({ id: 'today' }), task({ id: 'late', fechaLimite: '2026-09-30' }), task({ id: 'high', prioridad: 'Alta' })];
  assert.deepEqual(sortTasks(list, now).map((t) => t.id), ['late', 'high', 'today', 'future', 'done']);
  assert.deepEqual(urgentTasks([...list, task({ id: 'soon', fechaLimite: '2026-10-05', prioridad: 'Alta' }), task({ id: 'far', fechaLimite: '2026-12-01', prioridad: 'Alta' })], now).map((t) => t.id), ['late', 'high', 'today', 'soon']);
});

test('CRUD local, IDs únicos, persistencia, completar/reabrir y sin efectos sobre Agenda/Finanzas', async () => {
  storage();
  const repo = new LocalStorageLegalRepository();
  const events = await repo.getEvents();
  const payments = await repo.getPayments();
  const first = await repo.addTask({ ...draft, horaLimite: '15:00', descripcion: 'Notas' });
  const second = await repo.addTask(draft);
  assert.notEqual(first.id, second.id);
  const edited = await repo.updateTask(first.id, { ...draft, casoId: 'cas-3', titulo: 'Revisar', horaLimite: undefined, descripcion: undefined });
  assert.equal(edited.createdAt, first.createdAt);
  assert.equal(edited.horaLimite, undefined);
  const done = await repo.setTaskStatus(first.id, 'Completada');
  assert.ok(done.completedAt);
  assert.equal((await repo.updateTask(first.id, { ...draft, casoId: 'cas-3' })).completedAt, done.completedAt);
  const reopened = await repo.setTaskStatus(first.id, 'Pendiente');
  assert.equal(reopened.completedAt, undefined);
  assert.equal(reopened.fechaLimite, first.fechaLimite);
  const reloaded = new LocalStorageLegalRepository();
  assert.equal((await reloaded.getTasks('cas-3')).find((t) => t.id === first.id)?.estado, 'Pendiente');
  await reloaded.deleteTask(first.id);
  assert.equal((await new LocalStorageLegalRepository().getTasks()).some((t) => t.id === first.id), false);
  assert.deepEqual(await repo.getEvents(), events);
  assert.deepEqual(await repo.getPayments(), payments);
  await assert.rejects(() => repo.addTask({ ...draft, casoId: 'missing' }));
  await assert.rejects(() => repo.updateTask('missing', draft));
});

test('lista vacía no vuelve a sembrar; reiniciar demo restaura tareas y limpia nuevas', async () => {
  storage();
  const repo = new LocalStorageLegalRepository();
  for (const t of await repo.getTasks()) await repo.deleteTask(t.id);
  assert.deepEqual(await new LocalStorageLegalRepository().getTasks(), []);
  await repo.addTask(draft);
  await repo.resetToInitial();
  const reset = await repo.getTasks();
  assert.equal(reset.length, 4);
  assert.equal(reset.some((t) => t.id.startsWith('task-demo')), true);
  assert.equal(reset.some((t) => t.estado === 'Completada'), true);
  assert.equal(reset.some((t) => t.fechaLimite === taskToday(new Date())), true);
});

test('fallo de escritura visible: no cambia memoria ni reporta éxito', async () => {
  const { store } = storage();
  const repo = new LocalStorageLegalRepository();
  const before = await repo.getTasks();
  store.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(() => repo.addTask(draft), /No se pudo guardar/);
  await assert.rejects(() => repo.deleteTask(before[0].id), /No se pudo guardar/);
  assert.deepEqual(await repo.getTasks(), before);
});

test('contenido corrupto se conserva y produce error visible', async () => {
  const { values } = storage();
  values.set(key, '{broken');
  const repo = new LocalStorageLegalRepository();
  await assert.rejects(() => repo.getTasks(), /cargar las tareas/);
  await assert.rejects(() => repo.addTask(draft), /cargar las tareas/);
  assert.equal(values.get(key), '{broken');
  const invalid = JSON.stringify([task({ estado: 'Completada', completedAt: 'invalid' })]);
  values.set(key, invalid);
  await assert.rejects(() => new LocalStorageLegalRepository().getTasks(), /cargar las tareas/);
  assert.equal(values.get(key), invalid);
});
