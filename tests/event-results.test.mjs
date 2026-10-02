import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { applyEventResult, eventState, pendingEventResult } = require('../node_modules/.tmp/task-tests/services/eventResults.js');
const { LocalStorageLegalRepository } = require('../node_modules/.tmp/task-tests/repositories/localStorageRepo.js');
const now = new Date('2026-10-02T16:00:00Z');
const event = { id: 'one', casoId: 'cas-1', tipo: 'Audiencia', titulo: 'Audiencia de prueba', fecha: '2026-10-01', hora: '10:00', juzgado: 'Sala 1', descripcion: 'Notas' };
const draft = { tipo: 'Realizada', observaciones: 'Se realizó la actuación.', fecha: '2026-10-01', proximosPasos: 'Revisar documentos' };
test('compatibilidad: pasado no implica realizado; horas, fecha sin hora y resultados pendientes', () => {
  assert.equal(eventState(event), 'Próximo');
  assert.equal(pendingEventResult(event, now), true);
  assert.equal(pendingEventResult({...event,fecha:'2026-10-02',hora:undefined},now),false);
  assert.equal(pendingEventResult({...event,fecha:'2026-10-02',hora:'11:00'},now),true);
  assert.equal(eventState({...event,realizado:true}),'Realizado');
  assert.equal(pendingEventResult({...event,fecha:'2099-01-01'},now),false);
});
test('Realizada, Suspendida, Cancelada, Otro: estado, edición y aislamiento', () => {
  for(const tipo of ['Realizada','Suspendida','Cancelada','Otro']) {
    const first=applyEventResult([event],'cas-1','one',{...draft,tipo},now);
    assert.equal(first[0].estado,tipo==='Cancelada'?'Cancelado':'Realizado');
    assert.equal(pendingEventResult(first[0],now),false);
    const edited=applyEventResult(first,'cas-1','one',{...draft,tipo,observaciones:'Corregido'},new Date('2026-10-03T16:00:00Z'));
    assert.equal(edited.length,1);assert.equal(edited[0].resultado.observaciones,'Corregido');
    assert.equal(edited[0].resultado.registradoEn,first[0].resultado.registradoEn);
  }
  assert.throws(()=>applyEventResult([event],'cas-2','one',draft,now),/pertenece/);
});
test('reprogramar conserva original, copia contexto y edición no duplica la cita', () => {
  const data={...draft,tipo:'Reprogramada',nuevaFecha:'2026-10-05',nuevaHora:'15:30'};
  const first=applyEventResult([event],'cas-1','one',data,now);
  assert.equal(first.length,2);assert.equal(first[0].fecha,event.fecha);assert.equal(first[0].hora,event.hora);
  assert.equal(first[1].eventoOrigenId,event.id);assert.equal(first[1].casoId,event.casoId);
  assert.equal(first[1].juzgado,event.juzgado);assert.equal(first[1].descripcion,event.descripcion);
  const edited=applyEventResult(first,'cas-1','one',{...data,nuevaFecha:'2026-10-06'},now);
  assert.equal(edited.length,2);assert.equal(edited[1].id,first[1].id);assert.equal(edited[1].fecha,'2026-10-06');
  const corrected=applyEventResult(edited,'cas-1','one',draft,now);
  assert.equal(corrected[1].estado,'Cancelado');assert.equal(corrected.length,2);
  const closed=first.map(e=>e.id==='one'?e:{...e,realizado:true,estado:'Realizado'});
  assert.throws(()=>applyEventResult(closed,'cas-1','one',{...data,nuevaFecha:'2026-10-07'},now),/cerrado/);
  assert.equal(applyEventResult(closed,'cas-1','one',{...data,observaciones:'Aclaración'},now).length,2);
});
test('validaciones de observaciones, fechas y nueva cita futura', () => {
  for(const patch of [{observaciones:' '},{fecha:'2026-02-30'},{tipo:'Reprogramada'},{tipo:'Reprogramada',nuevaFecha:'2026-10-01'},{tipo:'Reprogramada',nuevaFecha:'2026-10-02',nuevaHora:'11:00'}]) assert.throws(()=>applyEventResult([event],'cas-1','one',{...draft,...patch},now));
});
test('repositorio: recarga conserva resultado y nueva cita; fallo no guarda parcialmente', async () => {
  const values=new Map([['abogadospro_events_v1',JSON.stringify([event])]]);
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
  const repo=new LocalStorageLegalRepository();
  const saved=await repo.saveEventResult('cas-1','one',{...draft,tipo:'Reprogramada',nuevaFecha:'2099-01-01'});
  assert.equal(saved.length,2);assert.deepEqual(await new LocalStorageLegalRepository().getEvents('cas-1'),JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(await repo.getEvents('cas-2'),[]);
  storage.setItem=()=>{throw new Error('Quota');};
  await assert.rejects(()=>repo.saveEventResult('cas-1','one',{...draft,tipo:'Reprogramada',nuevaFecha:'2099-01-02'}),/No se pudo guardar/);
  assert.deepEqual(await repo.getEvents(),saved);
});
