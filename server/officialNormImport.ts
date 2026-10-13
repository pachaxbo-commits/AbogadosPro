import { createHash, randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

type NormRecord = Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'documentType' | 'date' | 'officialUrl' | 'issuer' | 'matter' | 'indexableText' | 'keywords'>;
const laborHost = 'mintrabajo.gob.bo';
const asfiHost = 'www.asfi.gob.bo';
const laborSections = ['normativa-externa', 'normativa-interna'] as const;
const asfiSections = ['normativa-nacional', 'decretos'] as const;
const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&(?:nbsp|amp|quot|aacute|eacute|iacute|oacute|uacute|ntilde);/g, entity => ({
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  })[entity] || entity).replace(/\s+/g, ' ').trim();
const sha = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 20);
const dateFrom = (value: string) => {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : undefined;
};
const officialPdf = (raw: string, page: string, host: string) => {
  const url = new URL(raw.replace(/&amp;/g, '&'), page);
  if (url.protocol !== 'https:' || ![host, host.replace(/^www\./, '')].includes(url.hostname) || !url.pathname.toLowerCase().endsWith('.pdf')) return undefined;
  url.hash = '';
  return url.href;
};
const cells = (row: string) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
const firstPdf = (cell: string, page: string, host: string) => [...cell.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
  .map(match => officialPdf(match[1], page, host)).find(Boolean);
const normNumber = (title: string) => title.match(/(?:n[°ºo.]?\s*|número\s*)(\d+(?:\s*\/\s*\d{2,4})?)/i)?.[1]?.replace(/\s+/g, '') || undefined;

export function parseLaborNorms(html: string, page: string): NormRecord[] {
  const section = page.includes('normativa-externa') ? 'Normativa externa' : 'Normativa interna';
  const records: NormRecord[] = [];
  const table = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const values = cells(row[1]);
    if (values.length < 5) continue;
    const type = clean(values[1]);
    const title = clean(values[2]);
    const pdf = firstPdf(values.at(-1) || '', page, laborHost);
    if (!type || !title || !pdf) continue;
    const description = values.length >= 6 ? clean(values[3]) : '';
    const date = dateFrom(clean(values.at(-2) || ''));
    records.push({ source: 'Ministerio de Trabajo', sourceId: sha(pdf), kind: 'normativa', title, number: normNumber(title),
      documentType: type, date, officialUrl: pdf, issuer: 'Ministerio de Trabajo', matter: 'Laboral',
      indexableText: description && !/lorem ipsum/i.test(description) ? description.slice(0, 500) : undefined,
      keywords: [section] });
  }
  return records;
}

const spanishMonths: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
const asfiDate = (title: string) => {
  const match = /\b(\d{1,2})\s+de\s+([a-zá]+)\s+de\s+(\d{4})/i.exec(title);
  const month = match && spanishMonths[match[2].toLowerCase()];
  return match && month ? `${match[3]}-${month}-${match[1].padStart(2, '0')}` : undefined;
};
export function parseAsfiNorms(html: string, page: string): NormRecord[] {
  const type = page.endsWith('/decretos') ? 'Decreto Supremo' : 'Ley';
  const records: NormRecord[] = [];
  const table = html.match(/<table\b[^>]*class=["'][^"']*table-striped[^"']*["'][^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || '';
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const values = cells(row[1]);
    if (values.length < 2) continue;
    const title = clean(values[0]);
    const pdf = firstPdf(values[0], page, asfiHost);
    if (!title || !pdf || !new RegExp(type === 'Ley' ? '^Ley\\b' : '^Decreto Supremo\\b', 'i').test(title)) continue;
    const description = clean(values[1]);
    records.push({ source: 'ASFI', sourceId: sha(pdf), kind: 'normativa', title, number: normNumber(title),
      documentType: type, date: asfiDate(title), officialUrl: pdf, issuer: 'Estado Plurinacional de Bolivia',
      matter: 'Normativa nacional', indexableText: description.slice(0, 500) || undefined, keywords: [] });
  }
  return records;
}

function sameNorm(a: LegalDocument, b: NormRecord) {
  if (a.officialUrl === b.officialUrl) return true;
  if (!a.number || !b.number || a.number !== b.number || a.kind !== 'normativa') return false;
  const kind = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['ley', 'decreto supremo'].some(type => kind(a.documentType || '').includes(type) && kind(b.documentType || '').includes(type));
}
function insert(base: LegalBase, record: NormRecord, prefix: string, run: LegalImportRun, now: string) {
  const id = `${prefix}:${record.sourceId}`;
  const existing = base.documents.findIndex(item => item.id === id);
  if (existing < 0 && base.documents.some(item => sameNorm(item, record))) { run.unchanged++; return; }
  const hash = documentHash(record);
  if (existing < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
  else if (documentHash(base.documents[existing]) !== hash) { base.documents[existing] = { ...base.documents[existing], ...record, hash, updatedAt: now }; run.updated++; }
  else { base.documents[existing].hash = hash; run.unchanged++; }
}

async function runImport(sourceId: string, sourceName: string, url: string, pages: string[], parse: (html: string, page: string) => NormRecord[], path: string, fetchPage: typeof fetch) {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: sourceId, page: 1, mode: 'batch', status: 'running', startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  const now = new Date().toISOString();
  const seenIds = new Set<string>();
  for (const [index, page] of pages.entries()) {
    if (index && fetchPage === fetch) await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const response = await fetchPage(page, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok || new URL(response.url).hostname !== new URL(page).hostname) throw new Error(`Respuesta ${response.status} o redirección ajena.`);
      const records = parse((await response.text()).slice(0, 400000), page);
      if (!records.length) throw new Error('No se encontraron documentos reconocibles.');
      run.reviewed = (run.reviewed || 0) + records.length;
      for (const record of records) {
        if (seenIds.has(record.sourceId)) { run.unchanged++; continue; }
        seenIds.add(record.sourceId);
        insert(base, record, sourceId, run, now);
      }
    } catch (error) { run.errors.push({ message: `${page}: ${error instanceof Error ? error.message : String(error)}` }); }
  }
  const source = base.sources.find(item => item.id === sourceId);
  if (source) source.lastImportedAt = now;
  else base.sources.push({ id: sourceId, name: sourceName, officialUrl: url, enabled: true, lastImportedAt: now });
  run.status = !run.reviewed ? 'failed' : run.errors.length ? 'partial' : 'completed';
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}

export async function importLaborNorms(path = legalBasePath, fetchPage: typeof fetch = fetch, internalPages = 3) {
  if (!Number.isSafeInteger(internalPages) || internalPages < 1 || internalPages > 16) throw new Error('Páginas laborales inválidas.');
  const root = 'https://mintrabajo.gob.bo/index.php/';
  const pages = [root + laborSections[0] + '/', ...Array.from({ length: internalPages }, (_, index) => `${root}${laborSections[1]}/${index ? `page/${index + 1}/` : ''}`)];
  return runImport('mintrabajo', 'Ministerio de Trabajo', pages[0], pages, parseLaborNorms, path, fetchPage);
}
export async function importAsfiNorms(path = legalBasePath, fetchPage: typeof fetch = fetch) {
  const root = 'https://www.asfi.gob.bo/pb/';
  const pages = asfiSections.map(section => root + section);
  return runImport('asfi', 'ASFI', pages[0], pages, parseAsfiNorms, path, fetchPage);
}
