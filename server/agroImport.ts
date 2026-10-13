import { randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const host = 'arbol.tribunalagroambiental.bo';
const clean = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code))).replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function parseAgroPage(html: string): { records: Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'tribunal' | 'year' | 'resolutionType' | 'officialUrl' | 'keywords'>[]; errors: LegalImportRun['errors'] } {
  const records: ReturnType<typeof parseAgroPage>['records'] = [];
  const errors: LegalImportRun['errors'] = [];
  for (const match of html.matchAll(/<tr\s+data-key="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const sourceId = match[1];
    const row = match[2];
    const fields = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(part => clean(part[1]));
    const href = row.match(/<a\s+href="([^"]+)"\s+title="Resolución"/i)?.[1];
    try {
      const officialUrl = new URL((href || '').replace(/&amp;/g, '&'), `https://${host}`).href;
      const url = new URL(officialUrl);
      if (url.protocol !== 'https:' || url.hostname !== host || url.searchParams.get('id') !== sourceId || url.searchParams.get('r') !== 'ficha/verresolucionta' || fields.length < 5 || !fields[1]) throw new Error('Referencia o enlace oficial incompleto.');
      records.push({
        source: 'Tribunal Agroambiental', sourceId, kind: 'jurisprudencia',
        title: fields[1], number: fields[2] || undefined, year: fields[3] || undefined,
        resolutionType: fields[4] || undefined, tribunal: 'Tribunal Agroambiental',
        officialUrl, keywords: [],
      });
    } catch (error) { errors.push({ sourceId, message: error instanceof Error ? error.message : 'Registro inválido.' }); }
  }
  if (!records.length && !errors.length) errors.push({ message: 'La página no contenía registros reconocibles; no se guardó como importación válida.' });
  return { records, errors };
}

export async function importAgroPage(page = 1, path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new Error('Indica una sola página válida (1 a 10000).');
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: 'agroambiental', page, mode: 'page', status: 'running', startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    const url = new URL('https://arbol.tribunalagroambiental.bo/index.php');
    url.searchParams.set('r', 'viewresolucion/listaresoluciones');
    url.searchParams.set('page', String(page));
    const response = await fetchPage(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok || new URL(response.url).hostname !== host) throw new Error(`La fuente oficial no respondió correctamente (${response.status}).`);
    const html = (await response.text()).slice(0, 500000);
    const parsed = parseAgroPage(html);
    run.reviewed = parsed.records.length + parsed.errors.length;
    run.errors.push(...parsed.errors);
    if (!parsed.records.length) throw new Error('No se importó ningún registro de esta página.');
    const now = new Date().toISOString();
    for (const record of parsed.records) {
      const id = `agroambiental:${record.sourceId}`;
      const index = base.documents.findIndex(item => item.id === id);
      const merged = index < 0 ? record : { ...base.documents[index], ...record };
      const hash = documentHash(merged);
      if (index < 0) {
        base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now });
        run.inserted++;
      } else if (documentHash(base.documents[index]) !== hash) {
        base.documents[index] = { ...merged, hash, updatedAt: now };
        run.updated++;
      } else { base.documents[index].hash = hash; run.unchanged++; }
    }
    run.status = run.errors.length ? 'partial' : 'completed';
    const source = base.sources.find(item => item.id === 'agroambiental');
    if (source) source.lastImportedAt = now;
  } catch (error) {
    run.status = 'failed';
    run.errors.push({ message: error instanceof Error ? error.message : 'Error de importación.' });
  }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}

export function parseAgroDetail(html: string) {
  const header = html.split(/<b>\s*VISTOS\s*:/i)[0].slice(0, 30000);
  const field = (label: string) => clean(new RegExp(`<b>\\s*${label}\\s*:?\\s*<\\/b>\\s*([^<]*)`, 'i').exec(header)?.[1] || '') || undefined;
  const dateText = field('Fecha');
  const spanishMonths: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
  const dateParts = dateText?.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  const month = dateParts && spanishMonths[dateParts[2].toLowerCase()];
  return {
    caseFile: field('Expediente'), process: field('Proceso'), district: field('Distrito'),
    reportingJudge: field('Magistrad[oa]\\s+Relator[oa]'), claimant: field('Demandante'), respondents: field('Demandados'),
    date: dateParts && month ? `${dateParts[3]}-${month}-${dateParts[1].padStart(2, '0')}` : undefined,
  };
}

export async function enrichAgroRecord(sourceId: string, path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  if (!/^\d{1,10}$/.test(sourceId)) throw new Error('Indica un ID oficial de resolución válido.');
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: 'agroambiental', page: 0, mode: 'detail', sourceId, status: 'running', startedAt: new Date().toISOString(), reviewed: 1, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    const index = base.documents.findIndex(item => item.id === `agroambiental:${sourceId}`);
    if (index < 0) throw new Error('Primero importa la página del listado que contiene esta resolución.');
    const url = base.documents[index].officialUrl;
    const response = await fetchPage(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok || new URL(response.url).hostname !== host) throw new Error(`La resolución oficial no respondió correctamente (${response.status}).`);
    const detail = parseAgroDetail((await response.text()).slice(0, 50000));
    if (!Object.values(detail).some(Boolean)) throw new Error('No se encontraron metadatos reconocibles en el encabezado.');
    const merged = { ...base.documents[index], ...Object.fromEntries(Object.entries(detail).filter(([, value]) => value)) } as LegalDocument;
    const hash = documentHash(merged);
    if (hash === documentHash(base.documents[index])) { base.documents[index].hash = hash; run.unchanged++; }
    else { base.documents[index] = { ...merged, hash, updatedAt: new Date().toISOString() }; run.updated++; }
    run.status = 'completed';
  } catch (error) { run.status = 'failed'; run.errors.push({ sourceId, message: error instanceof Error ? error.message : 'Error de importación.' }); }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
