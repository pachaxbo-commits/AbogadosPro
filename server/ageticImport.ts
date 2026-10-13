import { createHash, randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const sourceId = 'agetic';
const sourceName = 'AGETIC · Normativa Nacional';
const listingUrl = 'https://agetic.gob.bo/normativa/normativa-nacional';
type RecordFields = Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'documentType' | 'date' | 'officialUrl' | 'issuer' | 'matter' | 'indexableText' | 'keywords'>;

const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&(?:nbsp|amp|quot|aacute|eacute|iacute|oacute|uacute|ntilde);/g, entity => ({
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  })[entity] || entity).replace(/\s+/g, ' ').trim();

export function parseAgeticNorms(html: string, page: string): RecordFields[] {
  const records: RecordFields[] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    if (cells.length < 6) continue;
    const type = clean(cells[1]);
    const title = clean(cells[2]);
    const description = clean(cells[3]);
    const dateParts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean(cells[4]));
    const href = [...cells[5].matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(match => match[1]).find(value => /\.pdf(?:[?#]|$)/i.test(value));
    if (!title || !href || !/^(?:ley|decreto|resoluci[oó]n|constituci[oó]n)/i.test(title)) continue;
    let officialUrl: URL;
    try { officialUrl = new URL(href.replace(/&amp;/g, '&'), page); } catch { continue; }
    if (officialUrl.protocol !== 'https:' || officialUrl.hostname !== 'agetic.gob.bo' || !/\.pdf$/i.test(officialUrl.pathname)) continue;
    officialUrl.hash = '';
    const number = title.match(/(?:n[°ºo.]?\s*)(\d+(?:\s*\/\s*\d{2,4})?)/i)?.[1]?.replace(/\s+/g, '');
    const sourceId = createHash('sha256').update(officialUrl.href).digest('hex').slice(0, 20);
    records.push({ source: sourceName, sourceId, kind: 'normativa', number, title,
      documentType: type || undefined, date: dateParts ? `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}` : undefined,
      officialUrl: officialUrl.href,
      indexableText: description.slice(0, 500) || undefined, keywords: [] });
  }
  return [...new Map(records.map(record => [record.sourceId, record])).values()];
}

export async function importAgeticNorms(path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: sourceId, page: 1, mode: 'batch', status: 'running',
    startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  const seen = new Set<string>();
  const now = new Date().toISOString();
  for (let page = 0; page < 3; page++) {
    if (page && fetchPage === fetch) await new Promise(resolve => setTimeout(resolve, 800));
    const url = page ? `${listingUrl}?page=${page}` : listingUrl;
    try {
      const response = await fetchPage(url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok || new URL(response.url).hostname !== 'agetic.gob.bo') throw new Error(`Respuesta ${response.status} o redirección ajena.`);
      const records = parseAgeticNorms((await response.text()).slice(0, 500000), url);
      if (!records.length) throw new Error('No se encontraron normas con documento oficial reconocible.');
      run.reviewed = (run.reviewed || 0) + records.length;
      for (const record of records) {
        if (seen.has(record.sourceId)) { run.unchanged++; continue; }
        seen.add(record.sourceId);
        const id = `${sourceId}:${record.sourceId}`;
        const index = base.documents.findIndex(document => document.id === id);
        if (index < 0 && base.documents.some(document => document.officialUrl === record.officialUrl)) { run.unchanged++; continue; }
        const hash = documentHash(record);
        if (index < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
        else if (documentHash(base.documents[index]) !== hash) { base.documents[index] = { ...base.documents[index], ...record, hash, updatedAt: now }; run.updated++; }
        else { base.documents[index].hash = hash; run.unchanged++; }
      }
    } catch (error) { run.errors.push({ message: `${url}: ${error instanceof Error ? error.message : String(error)}` }); }
  }
  if (run.reviewed) {
    const source = base.sources.find(item => item.id === sourceId);
    if (source) source.lastImportedAt = now;
    else base.sources.push({ id: sourceId, name: sourceName, officialUrl: listingUrl, enabled: true, lastImportedAt: now });
  }
  run.status = !run.reviewed ? 'failed' : run.errors.length ? 'partial' : 'completed';
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
