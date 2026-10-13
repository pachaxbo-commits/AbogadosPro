import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const storage = new Map();
const exports = {};
const source = readFileSync(new URL('../src/repositories/configurationRepository.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
runInNewContext(compiled, {
  exports,
  require: () => ({ DOCUMENT_CATEGORIES: ['Contrato'] }),
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
});
const { CATEGORY_DEFAULTS, configurationRepository } = exports;
const newAreas = ['Tributario', 'Niñez y Adolescencia', 'Administrativo y Trámites'];

test('las tres áreas aparecen una vez para estudios nuevos y configuraciones anteriores', () => {
  assert.equal(CATEGORY_DEFAULTS.areas.length, 7);
  const old = { categories: { areas: ['Civil', 'Familiar', 'Tributario', 'Área propia'] } };
  storage.set('abogadospro_configuration_v1:antiguo', JSON.stringify(old));
  const migrated = configurationRepository.get('antiguo');
  assert.deepEqual(Array.from(migrated.categories.areas), ['Civil', 'Familiar', 'Tributario', 'Área propia', 'Niñez y Adolescencia', 'Administrativo y Trámites']);
  for (const area of newAreas) assert.equal(migrated.categories.areas.filter(value => value === area).length, 1);
  assert.deepEqual(JSON.parse(storage.get('abogadospro_configuration_v1:antiguo')), old);
});

test('una categoría nueva eliminada después de guardar no se agrega de nuevo', () => {
  const updated = configurationRepository.get('antiguo');
  updated.categories.areas = updated.categories.areas.filter(area => area !== 'Tributario');
  configurationRepository.save('antiguo', updated);
  assert.equal(configurationRepository.get('antiguo').categories.areas.includes('Tributario'), false);
});
