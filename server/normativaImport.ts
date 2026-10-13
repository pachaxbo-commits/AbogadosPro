import { randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const host = 'web.mingobierno.gob.bo';
const listingUrl = `https://${host}/?post_type=normativa`;
type ImportedNorm = Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'documentType' | 'date' | 'officialUrl' | 'keywords'>;

const clean = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&aacute;/g, 'á')
  .replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú')
  .replace(/&ntilde;/g, 'ñ').replace(/\s+/g, ' ').trim();

export function parseNormativaListing(html: string): { records: ImportedNorm[]; errors: LegalImportRun['errors'] } {
  const records: ImportedNorm[] = [];
  const errors: LegalImportRun['errors'] = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    if (!row.includes('data-label="Tipo"')) continue;
    const cell = (label: string) => row.match(new RegExp(`<td\\s+data-label="${label}"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'))?.[1] || '';
    const type = clean(cell('Tipo'));
    const titleCell = cell('Título');
    const title = clean(titleCell);
    const number = clean(cell('Cite o Referencia'));
    const dateText = clean(cell('Fecha de Publicación'));
    const titleHref = titleCell.match(/<a\b[^>]*href="([^"]+)"/i)?.[1];
    const pdfHref = [...cell('Documentos').matchAll(/<a\b[^>]*href="([^"]+\.pdf(?:\?[^\"]*)?)"/gi)][0]?.[1];
    let sourceId: string | undefined;
    try {
      const entry = new URL(clean(titleHref || ''));
      if (entry.hostname !== host || entry.protocol !== 'https:') throw new Error('Enlace de ficha no oficial.');
      sourceId = entry.searchParams.get('normativa') || undefined;
      const pdf = new URL(clean(pdfHref || ''));
      if (!sourceId || pdf.hostname !== host || pdf.protocol !== 'https:' || !pdf.pathname.toLowerCase().endsWith('.pdf') || !type || !title) throw new Error('Metadatos o PDF oficial incompletos.');
      const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateText);
      const date = parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : undefined;
      records.push({ source: 'Ministerio de Gobierno', sourceId, kind: 'normativa', title, number: number || undefined,
        documentType: type, date, officialUrl: pdf.href, keywords: [] });
    } catch (error) { errors.push({ sourceId, message: `${title || 'Fila de normativa'}: ${error instanceof Error ? error.message : 'Registro inválido.'}` }); }
  }
  if (!records.length && !errors.length) errors.push({ message: 'El listado no contenía normas reconocibles.' });
  return { records, errors };
}

export async function importNormativa(path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: 'mingobierno', page: 1, mode: 'page', status: 'running', startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    const response = await fetchPage(listingUrl, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok || new URL(response.url).hostname !== host) throw new Error(`La fuente oficial no respondió correctamente (${response.status}).`);
    const parsed = parseNormativaListing((await response.text()).slice(0, 300000));
    run.reviewed = parsed.records.length + parsed.errors.length;
    run.errors.push(...parsed.errors);
    if (!parsed.records.length) throw new Error('No se importó ninguna norma del listado.');
    const now = new Date().toISOString();
    for (const record of parsed.records) {
      const id = `mingobierno:${record.sourceId}`;
      const index = base.documents.findIndex(item => item.id === id);
      const hash = documentHash(record);
      if (index < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
      else if (documentHash(base.documents[index]) !== hash) { base.documents[index] = { ...base.documents[index], ...record, hash, updatedAt: now }; run.updated++; }
      else { base.documents[index].hash = hash; run.unchanged++; }
    }
    let source = base.sources.find(item => item.id === 'mingobierno');
    if (!source) { source = { id: 'mingobierno', name: 'Ministerio de Gobierno', officialUrl: listingUrl, enabled: true }; base.sources.push(source); }
    source.lastImportedAt = now;
    run.status = run.errors.length ? 'partial' : 'completed';
  } catch (error) { run.status = 'failed'; run.errors.push({ message: error instanceof Error ? error.message : 'Error de importación.' }); }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
