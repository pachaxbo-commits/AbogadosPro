import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { cleanProfile, profileText, validateProfilePhoto } = require('../node_modules/.tmp/task-tests/services/profile.js');
const { whatsappUrl, whatsappShareUrl } = require('../node_modules/.tmp/task-tests/services/whatsapp.js');
const { LocalProfileRepository } = require('../node_modules/.tmp/task-tests/repositories/profileRepository.js');
const { TemporaryDocumentFiles } = require('../node_modules/.tmp/task-tests/services/documentFiles.js');
const { splitPhone, joinPhone } = require('../node_modules/.tmp/task-tests/services/phone.js');
const { appearanceRepository } = require('../node_modules/.tmp/task-tests/repositories/appearanceRepository.js');
const png = () => new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'foto.png', { type: 'image/png' });

test('perfil: campos opcionales, espacios y validaciones', () => {
  assert.deepEqual(cleanProfile({ nombre:' Ana Pérez ', estudio:' ', telefono:'+591 7000-0000' }), { nombre:'Ana Pérez', telefono:'+59170000000' });
  for (const data of [{ nombre:' ' }, { nombre:'Ana', correo:'mal' }, { nombre:'Ana', telefono:'70000000' }]) assert.throws(() => cleanProfile(data));
  assert.equal(profileText({ nombre:'Ana', estudio:'', correo:'ana@example.com' }), '*Ana*\n\nCorreo: ana@example.com');
});
test('presentación: respeta especialidad y estudio, separa párrafos y omite vacíos', () => {
  const text = profileText({nombre:' Ana ', estudio:'Pérez & Asociados', especialidad:'Derecho Civil', presentacion:'Atención personalizada.', direccion:' ', matricula:'123'});
  assert.equal(text, '*Ana*\nDerecho Civil\nPérez & Asociados\n\nMatrícula profesional: 123\n\nAtención personalizada.');
  assert.equal(new URL(whatsappShareUrl(text)).searchParams.get('text'),text);
});
test('presentación sin símbolos decorativos: conserva español al codificar WhatsApp', () => {
  const text = profileText({ nombre:'Darío Muñoz', especialidad:'Asistencia familiar', estudio:'Abogado', telefono:'+59169536012', correo:'dario@example.com', direccion:'Av. Santa Cruz', matricula:'12312', presentacion:'Atención: á, é, í, ó, ú, ñ.' });
  assert.equal(text, '*Darío Muñoz*\nAsistencia familiar\nAbogado\n\nCelular / WhatsApp: +59169536012\nCorreo: dario@example.com\nDirección: Av. Santa Cruz\nMatrícula profesional: 12312\n\nAtención: á, é, í, ó, ú, ñ.');
  assert.equal(new URL(whatsappShareUrl(text)).searchParams.get('text'), text);
  assert.doesNotMatch(text, /�|undefined|null|\p{Extended_Pictographic}/u);
});
test('teléfono: Bolivia por defecto, números existentes y países no listados', () => {
  assert.deepEqual(splitPhone(''), {code:'591',number:''});
  assert.equal(joinPhone({code:'591',number:'6953 6012'}), '+59169536012');
  for (const value of ['+591 71234567','59171234567','+591-71234567']) assert.deepEqual(splitPhone(value),{code:'591',number:'71234567'});
  assert.deepEqual(splitPhone('+54 9 (11) 1234-5678'),{code:'54',number:'91112345678'});
  assert.equal(whatsappUrl(joinPhone({code:'595',number:'981123456'})), 'https://wa.me/595981123456');
  assert.equal(joinPhone(splitPhone('+44 7700 900123')), '+447700900123');
  assert.equal(joinPhone({code:'54',number:''}), '');
});
test('apariencia: persistencia local separada por usuario', () => {
  const values = new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}});
  assert.equal(appearanceRepository.get('A'),'light');
  appearanceRepository.save('A','dark');
  assert.equal(appearanceRepository.get('A'),'dark');
  assert.equal(appearanceRepository.get('B'),'light');
  appearanceRepository.save('A','light');
  assert.equal(appearanceRepository.get('A'),'light');
});
test('WhatsApp: internacionales y mensajes codificados sin asumir país', () => {
  assert.equal(whatsappUrl('+54 9 (11) 1234-5678', 'Caso A & B'), 'https://wa.me/5491112345678?text=Caso%20A%20%26%20B');
  assert.equal(whatsappUrl('00591 70000000'), 'https://wa.me/59170000000');
  for (const value of ['', '70000000', 'abc59170000000']) assert.equal(whatsappUrl(value), null);
  assert.equal(new URL(whatsappShareUrl('Ana\nAbogada & Socia')).searchParams.get('text'), 'Ana\nAbogada & Socia');
});
test('foto: extensión, MIME, cabecera y límite', async () => {
  assert.equal(await validateProfilePhoto(png()), 'image/png');
  for (const file of [new File(['x'], 'foto.exe'), new File(['x'], 'foto.png'), new File([new Uint8Array(2097153)], 'foto.png'), new File([await png().arrayBuffer()], 'foto.png', {type:'application/pdf'})]) await assert.rejects(() => validateProfilePhoto(file));
});
test('repositorio: separación por usuario, recarga, foto temporal y fallo de guardado', async () => {
  const values = new Map();
  const store = { getItem:key=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value) };
  Object.defineProperty(globalThis,'localStorage',{ configurable:true,value:store });
  const files = new TemporaryDocumentFiles();
  const repo = new LocalProfileRepository(files);
  const a = await repo.save('A', {nombre:'Ana'}, png());
  await repo.save('B', {nombre:'Beatriz'});
  assert.equal((await repo.get('A')).nombre, 'Ana');
  assert.equal((await repo.get('B')).nombre, 'Beatriz');
  assert.ok(await repo.photoUrl(a));
  const reloaded = new LocalProfileRepository(new TemporaryDocumentFiles());
  assert.equal((await reloaded.get('A')).nombre, 'Ana');
  assert.equal(await reloaded.photoUrl(a), null);
  assert.ok(![...values.values()].join('').includes('base64'));
  store.setItem=()=>{ throw new Error('quota'); };
  await assert.rejects(()=>repo.save('A',{nombre:'Modificado'},png()), /guardar/);
  assert.equal((await repo.get('A')).nombre,'Ana');
  assert.ok(await repo.photoUrl(a));
  await files.clear();
});

