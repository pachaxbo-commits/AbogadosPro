import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importAgeticNorms, parseAgeticNorms } from '../server/ageticImport.ts';
import { readLegalBase, searchLegalBase } from '../server/legalBase.ts';
import { parseTsjSummaries } from '../server/tsjSummaryImport.ts';
import { importContraloriaNorms, parseContraloriaNorms } from '../server/contraloriaImport.ts';

const row = `<tr><td>1</td><td>Ley</td><td>Ley N° 164</td><td>Tecnologías de información y comunicación</td><td>08/08/2011</td><td><a href="/sites/default/files/ley-164.pdf">Descargar Archivo</a></td></tr>`;
const page = `<table><tbody>${row}<tr><td>2</td><td>Ley</td><td>Ley N° 999</td><td>Enlace externo</td><td>01/01/2020</td><td><a href="https://example.com/ley.pdf">Descargar Archivo</a></td></tr></tbody></table>`;

test('AGETIC only accepts official linked norms and remains idempotent', async () => {
  const records = parseAgeticNorms(page, 'https://agetic.gob.bo/normativa/normativa-nacional');
  assert.equal(records.length, 1);
  assert.equal(records[0].number, '164');
  assert.equal(records[0].officialUrl, 'https://agetic.gob.bo/sites/default/files/ley-164.pdf');
  const directory = await mkdtemp(join(tmpdir(), 'abogados-legal-'));
  try {
    const path = join(directory, 'legal-base.json');
    const fetchPage = async url => ({ ok: true, status: 200, url, text: async () => page });
    const first = await importAgeticNorms(path, fetchPage);
    const second = await importAgeticNorms(path, fetchPage);
    assert.equal(first.inserted, 1);
    assert.equal(second.inserted, 0);
    assert.equal((await readLegalBase(path)).documents.length, 1);
    const found = await searchLegalBase('normativa', 'tecnologías', {}, path);
    assert.equal(found.results[0]?.number, '164');
  } finally { await rm(directory, { recursive: true }); }
});

test('2024 TSJ summaries require a source synopsis', () => {
  const heading = 'SALA PENAL AUTO SUPREMO Nº 565/2024-RRC de 09 de abril de 2024 SÍNTESIS DEL CASO La parte recurrente reclamó falta de notificación con la sentencia y derecho a impugnar. RATIO DECIDENDI El tribunal consideró la notificación personal.';
  const volume = { year: 2024, url: 'https://tsj.bo/wp-content/uploads/2026/02/revista-jurisprudencia-2024.pdf' };
  const records = parseTsjSummaries([heading], volume);
  assert.equal(records.length, 1);
  assert.equal(records[0].number, '565/2024-RRC');
  assert.equal(records[0].date, '2024-04-09');
  assert.equal(records[0].officialUrl, `${volume.url}#page=1`);
  assert.equal(parseTsjSummaries([heading.replace('SÍNTESIS DEL CASO', 'OTROS DATOS')], volume).length, 0);
});

test('Contraloría imports legal PDFs without forms or external links', async () => {
  const html = `<table id="tablepress-9"><tbody>
    <tr><td><strong>NORMAS DE AUDITORÍA DE CUMPLIMIENTO</strong><br>Resolución CGE/038/2026 del 27/02/2026</td><td><a href="https://www.contraloria.gob.bo/wp-content/uploads/norma.pdf">PDF</a></td></tr>
    <tr><td>FORMULARIO DE AUDITORÍA</td><td><a href="https://www.contraloria.gob.bo/wp-content/uploads/form.pdf">PDF</a></td></tr>
    <tr><td>Ley Nº 100</td><td><a href="https://example.com/ley.pdf">PDF</a></td></tr>
  </tbody></table>`;
  assert.equal(parseContraloriaNorms(html).length, 1);
  const directory = await mkdtemp(join(tmpdir(), 'abogados-legal-'));
  try {
    const path = join(directory, 'legal-base.json');
    const fetchPage = async url => ({ ok: true, status: 200, url, text: async () => html });
    assert.equal((await importContraloriaNorms(path, fetchPage)).inserted, 1);
    assert.equal((await importContraloriaNorms(path, fetchPage)).inserted, 0);
    assert.equal((await readLegalBase(path)).documents.length, 1);
  } finally { await rm(directory, { recursive: true }); }
});
