import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const compiled = new URL('../node_modules/.tmp/task-tests/repositories/firestoreRepo.js', import.meta.url);
const require = createRequire(compiled);
// Adaptador Firestore en memoria: prueba el repositorio real sin tocar datos remotos.
const values = new Map();
const snap = ref => ({ id: ref.id, exists: () => values.has(ref.path), data: () => structuredClone(values.get(ref.path)) });
const api = {
  collection: (_, ...parts) => ({ path: parts.join('/') }),
  doc: (col, id = crypto.randomUUID()) => ({ path: col.path + '/' + id, id }),
  getDoc: async ref => snap(ref),
  setDoc: async (ref, data) => { values.set(ref.path, structuredClone(data)); },
  updateDoc: async (ref, data) => { assert.ok(values.has(ref.path)); values.set(ref.path, { ...values.get(ref.path), ...structuredClone(data) }); },
  deleteDoc: async ref => { values.delete(ref.path); },
  where: (field, _, value) => ({ field, value }),
  query: (col, filter) => ({ ...col, filter }),
  getDocs: async col => ({ docs: [...values.keys()].filter(path => path.startsWith(col.path + '/') && path.split('/').length === col.path.split('/').length + 1).filter(path => !col.filter || values.get(path)[col.filter.field] === col.filter.value).map(path => snap({ path, id: path.split('/').at(-1) })) }),
};
const exports = {};
vm.runInNewContext(fs.readFileSync(compiled, 'utf8'), { exports, require: name => name === 'firebase/firestore' ? api : name === '../services/firebaseConfig' ? { db: {} } : require(name), console });
const { FirestoreLegalRepository } = exports;
test('repositorio activo: caso real, nombres iguales, CRUD y aislamiento de tareas', async () => {
  values.clear();
  const a = new FirestoreLegalRepository('A');
  const b = new FirestoreLegalRepository('B');
  const first = await a.addCase({ nombre: 'Prestamo', clienteId: 'cliente-A' });
  const second = await a.addCase({ nombre: 'Prestamo', clienteId: 'cliente-A' });
  const data = { casoId: first.id, titulo: 'Documento', fechaLimite: '2026-10-03', prioridad: 'Media' };
  const task = await a.addTask(data);
  assert.equal(task.casoId, first.id);
  assert.equal((await a.getTasks(second.id)).length, 0);
  assert.equal((await b.getTasks()).length, 0);
  await assert.rejects(() => b.addTask(data), /caso existente/);
  await assert.rejects(() => a.addTask({ ...data, casoId: 'Prestamo' }), /caso existente/);
  await a.updateTask(task.id, { ...data, titulo: 'Actualizado' });
  assert.equal((await a.getTasks())[0].titulo, 'Actualizado');
  await a.setTaskStatus(task.id, 'Completada');
  assert.equal((await a.getTasks())[0].estado, 'Completada');
  await a.setTaskStatus(task.id, 'Pendiente');
  assert.equal((await a.getTasks())[0].completedAt, undefined);
  await a.deleteTask(task.id);
  assert.equal((await a.getTasks()).length, 0);
});
test('repositorio activo: movimientos nuevos y antiguos; clientes, casos, agenda y resultados', async () => {
  values.clear();
  const repo = new FirestoreLegalRepository('finance');
  const client = await repo.addClient({ nombre: 'Prueba', telefono: '70000000' });
  await repo.updateClient(client.id, { nombre: 'Prueba editada', telefono: '70000001' });
  assert.equal((await repo.getClientById(client.id)).nombre, 'Prueba editada');
  const caso = await repo.addCase({ nombre: 'Caso', clienteId: client.id, honorariosAcordados: 500 });
  await repo.updateCase(caso.id, { ...caso, nombre: 'Caso editado' });
  assert.equal((await repo.getCaseById(caso.id)).nombre, 'Caso editado');
  for (const [add, get, update, remove] of [['addPayment', 'getPayments', 'updatePayment', 'deletePayment'], ['addExpense', 'getExpenses', 'updateExpense', 'deleteExpense'], ['addReimbursement', 'getReimbursements', 'updateReimbursement', 'deleteReimbursement']]) {
    const old = await repo[add]({ casoId: caso.id, monto: 10, fecha: '2026-10-02' });
    assert.equal((await repo[get](caso.id))[0].hora, undefined);
    const fresh = await repo[add]({ casoId: caso.id, monto: 20, fecha: '2026-10-02', hora: '19:45' });
    await repo[update](fresh.id, { ...fresh, hora: '20:30' });
    assert.equal((await repo[get](caso.id)).find(item => item.id === fresh.id).hora, '20:30');
    await repo[remove](old.id);
    assert.equal((await repo[get](caso.id)).length, 1);
  }
  const evento = await repo.addEvent({ casoId: caso.id, tipo: 'Reunión', titulo: 'Revisión', fecha: '2026-10-02', recordatorios: { personalizados: [{ cantidad: 2, unidad: 'horas' }] } });
  await repo.updateEvent(evento.id, { ...evento, titulo: 'Revisión editada' });
  const result = { tipo: 'Realizada', observaciones: 'Hecho', fecha: '2026-10-02' };
  await repo.saveEventResult(caso.id, evento.id, result);
  await repo.saveEventResult(caso.id, evento.id, { ...result, observaciones: 'Corregido' });
  assert.equal((await repo.getEvents(caso.id)).length, 1);
  assert.equal((await repo.getEvents(caso.id))[0].resultado.observaciones, 'Corregido');
  assert.equal((await repo.getActivities()).length, 0);
});
