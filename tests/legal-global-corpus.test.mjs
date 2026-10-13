import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { legalSeedPath, readSharedLegalBase, searchLegalBase } from '../server/legalBase.ts';

test('un navegador limpio recibe el corpus global completo sin almacenamiento previo', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'abogados-legal-global-'));
  try {
    const overlayPath = join(directory, 'sin-sincronizacion.json');
    const base = await readSharedLegalBase(overlayPath, legalSeedPath);
    assert.equal(base.documents.length, 1175);
    assert.equal(base.sources.length, 8);
    assert.equal(new Set(base.documents.map(document => document.id)).size, base.documents.length);

    // Search through the same repository with no browser storage or local overlay.
    await writeFile(join(directory, 'corpus.json'), JSON.stringify(base));
    const path = join(directory, 'corpus.json');
    const divorce = await searchLegalBase('jurisprudencia', 'divorcio', {}, path);
    const dismissal = await searchLegalBase('jurisprudencia', 'despido injustificado', {}, path);
    assert.ok(divorce.results.length > 0);
    assert.ok(dismissal.results.length > 0);
    assert.ok(divorce.results.every(result => result.url.startsWith('https://')));

    const anotherBrowser = await readSharedLegalBase(overlayPath, legalSeedPath);
    assert.deepEqual(anotherBrowser.documents.map(document => document.id), base.documents.map(document => document.id));
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('una sincronización del servidor añade registros sin ocultar el corpus inicial', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'abogados-legal-global-'));
  try {
    const overlayPath = join(directory, 'sincronizacion.json');
    const seed = await readSharedLegalBase(overlayPath, legalSeedPath);
    const document = { ...seed.documents[0], id: 'test:shared', sourceId: 'shared' };
    await writeFile(overlayPath, JSON.stringify({ version: 1, sources: [], documents: [document], imports: [] }));
    const merged = await readSharedLegalBase(overlayPath, legalSeedPath);
    assert.equal(merged.documents.length, seed.documents.length + 1);
    assert.equal(merged.sources.length, seed.sources.length);
    assert.equal(merged.imports.length, seed.imports.length);
  } finally {
    await rm(directory, { recursive: true });
  }
});
