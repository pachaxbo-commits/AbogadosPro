import { createHash, randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const sourceId = 'contraloria';
const sourceName = 'Contraloría General del Estado';
const listingUrl = 'https://www.contraloria.gob.bo/biblioteca-normativa/';
type RecordFields = Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'documentType' | 'date' | 'officialUrl' | 'indexableText' | 'keywords'>;
const clean = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&(?:nbsp|amp|quot|aacute|eacute|iacute|oacute|uacute|ntilde);/g, entity => ({
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
  })[entity] || entity).replace(/\s+/g, ' ').trim();
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sha = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 20);

export function parseContraloriaNorms(html: string): RecordFields[] {
  const records: RecordFields[] = [];
  for (const table of html.matchAll(/<table\b[^>]*id=["']tablepress-\d+["'][^>]*>([\s\S]*?)<\/table>/gi)) {
    for (const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
      if (cells.length < 2) continue;
      const fullText = clean(cells[0]);
      const emphasized = clean(cells[0].match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)?.[1] || '');
      const title = (emphasized && /^(ley|decreto|resoluci[oó]n|reglamento|norma)/i.test(emphasized) ? emphasized : fullText).slice(0, 200);
      const normalized = fold(title);
      const kind = normalized.startsWith('ley') ? 'Ley' : normalized.startsWith('decreto') ? 'Decreto Supremo'
        : normalized.startsWith('resolucion') ? 'Resolución' : normalized.startsWith('reglamento') ? 'Reglamento'
          : normalized.startsWith('norma') ? 'Norma' : undefined;
      if (!kind) continue;
      const href = [...cells.slice(1).join('').matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
        .map(match => match[1]).find(value => /\.pdf(?:[?#]|$)/i.test(value));
      if (!href) continue;
      let url: URL;
      try { url = new URL(href.replace(/&amp;/g, '&'), listingUrl); } catch { continue; }
      if (url.protocol !== 'https:' || !['www.contraloria.gob.bo', 'contraloria.gob.bo'].includes(url.hostname) || !/\.pdf$/i.test(url.pathname)) continue;
      url.hash = '';
      const number = kind === 'Ley' || kind === 'Decreto Supremo'
        ? title.match(/(?:n[°ºo.]?\s*)(\d+(?:[-/]\w+)?)/i)?.[1]
          || title.match(/\b(?:Ley|Decreto Supremo)\s+(\d{3,6})\b/i)?.[1]
        : fullText.match(/\b(?:CGE|CGR)(?:-1)?\/?\d{1,4}\/\d{2,4}\b/i)?.[0];
      const dateParts = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(fullText);
      records.push({ source: sourceName, sourceId: sha(url.href), kind: 'normativa', title, number,
        documentType: kind, date: dateParts ? `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}` : undefined,
        officialUrl: url.href, indexableText: fullText.length > title.length ? fullText.slice(0, 500) : undefined,
        keywords: [] });
    }
  }
  return [...new Map(records.map(record => [record.sourceId, record])).values()];
}

export async function importContraloriaNorms(path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: sourceId, page: 1, mode: 'page', status: 'running',
    startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    const response = await fetchPage(listingUrl, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok || new URL(response.url).hostname !== 'www.contraloria.gob.bo') throw new Error(`Respuesta ${response.status} o redirección ajena.`);
    const records = parseContraloriaNorms((await response.text()).slice(0, 500000));
    if (!records.length) throw new Error('No se encontraron normas con enlaces PDF oficiales reconocibles.');
    run.reviewed = records.length;
    const now = new Date().toISOString();
    for (const record of records) {
      const id = `${sourceId}:${record.sourceId}`;
      const index = base.documents.findIndex(document => document.id === id);
      const hash = documentHash(record);
      if (index < 0 && base.documents.some(document => document.officialUrl === record.officialUrl)) { run.unchanged++; continue; }
      if (index < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
      else if (documentHash(base.documents[index]) !== hash) { base.documents[index] = { ...base.documents[index], ...record, hash, updatedAt: now }; run.updated++; }
      else { base.documents[index].hash = hash; run.unchanged++; }
    }
    const source = base.sources.find(item => item.id === sourceId);
    if (source) source.lastImportedAt = now;
    else base.sources.push({ id: sourceId, name: sourceName, officialUrl: listingUrl, enabled: true, lastImportedAt: now });
    run.status = 'completed';
  } catch (error) { run.status = 'failed'; run.errors.push({ message: error instanceof Error ? error.message : String(error) }); }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
