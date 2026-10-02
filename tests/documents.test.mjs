import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { LocalDocumentRepository, DOCUMENT_STORAGE_KEY } = require('../node_modules/.tmp/task-tests/repositories/documentsRepository.js');
const { TemporaryDocumentFiles } = require('../node_modules/.tmp/task-tests/services/documentFiles.js');
const { validateDocumentFile, documentErrors, MAX_DOCUMENT_BYTES, DOCUMENT_FORMATS } = require('../node_modules/.tmp/task-tests/services/documents.js');
const data = { nombre: 'Contrato del cliente', categoria: 'Contrato', descripcion: 'Firmado', fechaDocumento: '2026-10-02' };
const pdf = () => new File(['%PDF-1.4\n test'], 'contrato.pdf', { type: 'application/pdf' });
function setup() {
  const values = new Map();
  const store = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: store });
  const files = new TemporaryDocumentFiles();
  const repo = new LocalDocumentRepository(files, async (id) => ['A', 'B'].includes(id));
  return { values, store, files, repo };
}
test('documentos: campos, fechas reales y categorías', () => {
  assert.deepEqual(documentErrors(data), {});
  assert.deepEqual(Object.keys(documentErrors({ nombre: ' ', categoria: '', fechaDocumento: '2026-02-30' })), ['nombre', 'categoria', 'fechaDocumento']);
});
test('archivo: formatos permitidos, MIME y cabecera; rechaza extensión falsa, vacío y tamaño excesivo', async () => {
  for (const [ext, format] of Object.entries(DOCUMENT_FORMATS)) {
    const file = new File([new Uint8Array(format.signature)], `archivo.${ext}`, { type: format.mime });
    assert.equal(await validateDocumentFile(file), format.mime);
  }
  assert.equal(await validateDocumentFile(new File(['%PDF-1.4'], 'documento.PDF')), 'application/pdf');
  for (const file of [new File(['%PDF-1.4'], 'file.exe'), new File(['texto'], 'file.pdf', { type: 'application/pdf' }), new File([], 'file.pdf'), new File(['%PDF-1.4'], 'file.pdf', { type: 'image/png' })]) {
    await assert.rejects(() => validateDocumentFile(file), /Formato de archivo no permitido/);
  }
  await assert.rejects(() => validateDocumentFile(new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], 'grande.pdf')), /20 MB/);
});
test('documentos: CRUD aislado por caso y metadata separada del archivo', async () => {
  const { repo, files, values } = setup();
  const item = await repo.addDocument('A', data, pdf());
  assert.equal((await repo.getDocuments('A')).length, 1);
  assert.equal((await repo.getDocuments('B')).length, 0);
  await assert.rejects(() => repo.addDocument('missing', data, pdf()), /caso/);
  await assert.rejects(() => repo.updateDocument('B', item.id, data), /pertenece/);
  await assert.rejects(() => repo.deleteDocument('B', item.id), /pertenece/);
  await assert.rejects(() => repo.getFileUrl('B', item.id), /pertenece/);
  const url = await repo.getFileUrl('A', item.id);
  assert.ok(url.startsWith('blob:'));
  assert.equal(await (await fetch(url)).text(), '%PDF-1.4\n test');
  const updated = await repo.updateDocument('A', item.id, { ...data, nombre: 'Otro nombre', categoria: 'Prueba', fechaDocumento: '', descripcion: '' });
  assert.equal(updated.nombreArchivo, item.nombreArchivo);
  assert.equal(updated.referenciaArchivo, item.referenciaArchivo);
  assert.equal(updated.fechaCarga, item.fechaCarga);
  assert.equal(updated.fechaDocumento, undefined);
  assert.equal(await repo.getFileUrl('A', item.id), url);
  assert.equal(values.get(DOCUMENT_STORAGE_KEY).includes('blob:'), false);
  assert.equal(values.get(DOCUMENT_STORAGE_KEY).includes('base64'), false);
  await repo.deleteDocument('A', item.id);
  assert.equal((await repo.getDocuments('A')).length, 0);
  assert.equal(await files.getUrl(item.referenciaArchivo), null);
});
test('recarga: conserva metadata y reconoce archivo no disponible; permite editar sin archivo', async () => {
  const { repo } = setup();
  const item = await repo.addDocument('A', data, pdf());
  const reloaded = new LocalDocumentRepository(new TemporaryDocumentFiles(), async () => true);
  assert.equal((await reloaded.getDocuments('A')).length, 1);
  assert.equal(await reloaded.getFileUrl('A', item.id), null);
  assert.equal((await reloaded.updateDocument('A', item.id, { ...data, nombre: 'Editado sin archivo' })).nombre, 'Editado sin archivo');
});
test('fallo de persistencia revierte archivo temporal; contenido corrupto no se sobrescribe', async () => {
  const { repo, store, values, files } = setup();
  let reference;
  const save = files.save.bind(files);
  files.save = async (id, file) => { reference = id; await save(id, file); };
  store.setItem = () => { throw new Error('QuotaExceeded'); };
  await assert.rejects(() => repo.addDocument('A', data, pdf()), /No se pudo guardar/);
  assert.equal(await files.getUrl(reference), null);
  assert.deepEqual(await repo.getDocuments(), []);
  values.set(DOCUMENT_STORAGE_KEY, '{broken');
  await assert.rejects(() => repo.getDocuments(), /información guardada se conservó/);
  assert.equal(values.get(DOCUMENT_STORAGE_KEY), '{broken');
});
test('reinicio documental limpia metadata y revoca URLs', async () => {
  const { repo, files } = setup();
  const item = await repo.addDocument('A', data, pdf());
  const url = await repo.getFileUrl('A', item.id);
  await repo.reset();
  assert.deepEqual(await repo.getDocuments(), []);
  assert.equal(await files.getUrl(item.referenciaArchivo), null);
  await assert.rejects(() => fetch(url));
});
