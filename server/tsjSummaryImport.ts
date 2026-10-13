import { randomUUID } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const sourceId = 'tsj-resumenes';
const sourceName = 'Tribunal Supremo de Justicia · resúmenes';
const catalog = 'https://tsj.bo/jurisprudencia/';
// Public books linked by the TSJ's own jurisprudence/publications pages.
const volumes = [
  { year: 2022, url: 'https://tsj.bo/wp-content/uploads/2023/02/Revista-de-Jurisprudencia_compressed.pdf' },
  { year: 2023, url: 'https://tsj.bo/wp-content/uploads/2024/01/JURISPRUDENCIA-TSJ-2023.pdf' },
  { year: 2024, url: 'https://tsj.bo/wp-content/uploads/2026/02/revista-jurisprudencia-2024.pdf' },
] as const;
type RecordFields = Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'tribunal' | 'chamber' | 'matter' | 'date' | 'year' | 'resolutionType' | 'officialUrl' | 'indexableText' | 'keywords'>;
const months: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const themes = ['divorcio', 'despido injustificado', 'despido ilegal', 'falta de fundamentación', 'falta de motivación', 'medidas cautelares', 'medida cautelar', 'asistencia familiar', 'debido proceso'];
const officialHost = (url: string) => ['tsj.bo', 'www.tsj.bo'].includes(new URL(url).hostname);

function dateFrom(header: string) {
  const match = /\b(\d{1,2})\s+de\s+([a-zá]+)\s+(?:de\s+)?(\d{4})/i.exec(header);
  const month = match && months[normalize(match[2])];
  return match && month ? `${match[3]}-${month}-${match[1].padStart(2, '0')}` : undefined;
}
function excerptAround(text: string, term: string) {
  const at = normalize(text).indexOf(normalize(term));
  if (at < 0) return '';
  return text.slice(Math.max(0, at - 90), Math.min(text.length, at + term.length + 150)).replace(/\s+/g, ' ').trim();
}
function extractSummary(text: string) {
  const synopsis = /SÍNTESIS DEL CASO\s+([\s\S]*?)(?:RATIO DECIDENDI|DESCRIPTOR|RESTRICTOR|$)/i.exec(text)?.[1];
  const descriptor = /DESCRIPTOR\s+([\s\S]*?)(?:RESTRICTOR|FORMA DE RESOLUCIÓN|$)/i.exec(text)?.[1];
  const actualThemes = themes.filter(theme => normalize(text).includes(normalize(theme)));
  const excerpts = [synopsis?.replace(/\s+/g, ' ').trim().slice(0, 260), descriptor?.replace(/\s+/g, ' ').trim().slice(0, 260),
    ...actualThemes.slice(0, 4).map(theme => excerptAround(text, theme))].filter(Boolean);
  return { indexableText: [...new Set(excerpts)].join(' · ').slice(0, 1300) || undefined, keywords: actualThemes };
}

export function parseTsjSummaries(pages: string[], volume: { year: number; url: string }): RecordFields[] {
  const offsets: number[] = [];
  let full = '';
  for (const page of pages) { offsets.push(full.length); full += `${page}\n`; }
  const headerPattern = volume.year === 2024
    ? /AUTO SUPREMO\s+N[°ºo]?\s*(\d{1,4}\/2024(?:-[A-Z]{1,5})?)\s+de\s+\d{1,2}\s+de\s+[a-zá]+/gi
    : new RegExp(`AUTO SUPREMO\\s+N[°ºo]?\\s*(\\d{1,4}/${volume.year})\\s+de\\s+.{0,55}?MAGISTRAD[OA]\\s+RELATOR(?:A)?:`, 'gi');
  const headers = [...full.matchAll(headerPattern)];
  const results: RecordFields[] = [];
  for (const [index, header] of headers.entries()) {
    const start = header.index;
    const pageIndex = offsets.findLastIndex(offset => offset <= start);
    if (pageIndex < 0) continue;
    // A book can switch to another document type without a new Auto Supremo
    // header. Never attribute distant pages to this ruling.
    const end = Math.min(headers[index + 1]?.index ?? full.length, offsets[pageIndex + 4] ?? full.length);
    const text = full.slice(start, end);
    if (text.length < 120 || (volume.year === 2024 && !/SÍNTESIS DEL CASO/i.test(text))) continue;
    const page = pageIndex + 1;
    const pageHeading = pages[pageIndex].slice(0, 180);
    const chamber = /SALA\s*CIVIL/i.test(pageHeading) ? 'Sala Civil'
      : /SALA\s*PENAL/i.test(pageHeading) ? 'Sala Penal'
        : /SALA\s*SOCIAL/i.test(pageHeading) ? 'Sala Social' : undefined;
    const descriptor = /DESCRIPTOR\s+DERECHO\s+(?:DE\s+)?(FAMILIA|CIVIL|PENAL|LABORAL|SOCIAL|ADMINISTRATIVO)/i.exec(text)?.[1];
    const matter = descriptor ? ({ FAMILIA: 'Familiar', CIVIL: 'Civil', PENAL: 'Penal', LABORAL: 'Laboral', SOCIAL: 'Laboral', ADMINISTRATIVO: 'Administrativo' } as Record<string, string>)[descriptor.toUpperCase()] : undefined;
    const content = extractSummary(text);
    results.push({ source: sourceName, sourceId: `${volume.year}:${header[1]}:p${page}`, kind: 'jurisprudencia',
      number: header[1], title: `Auto Supremo N° ${header[1]} · resumen oficial`, tribunal: 'Tribunal Supremo de Justicia',
      chamber, matter, date: dateFrom(volume.year === 2024 ? text.slice(0, 160) : header[0]), year: String(volume.year), resolutionType: 'Auto Supremo',
      officialUrl: `${volume.url}#page=${page}`, ...content });
  }
  return results;
}

async function readOfficialPdf(url: string, fetchPage: typeof fetch) {
  const response = await fetchPage(url, { headers: { Accept: 'application/pdf' }, signal: AbortSignal.timeout(45000) });
  if (!response.ok || !officialHost(response.url) || !response.headers.get('content-type')?.toLowerCase().includes('pdf')) throw new Error(`PDF oficial no disponible (${response.status}).`);
  const length = Number(response.headers.get('content-length') || '0');
  if (length > 20_000_000) throw new Error('El compendio supera el límite prudente de 20 MB.');
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength > 20_000_000 || String.fromCharCode(...data.slice(0, 4)) !== '%PDF') throw new Error('Archivo PDF inválido o demasiado grande.');
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  if (pdf.numPages > 500) throw new Error('El compendio excede el límite de 500 páginas.');
  const pages: string[] = [];
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent();
    pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' ').replace(/\s+/g, ' '));
  }
  await pdf.destroy();
  return pages;
}

export async function importTsjSummaries(path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: sourceId, page: 1, mode: 'batch', status: 'running', startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  const now = new Date().toISOString();
  for (const [index, volume] of volumes.entries()) {
    if (index && fetchPage === fetch) await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const records = parseTsjSummaries(await readOfficialPdf(volume.url, fetchPage), volume);
      if (!records.length) throw new Error('No se identificaron Autos Supremos con referencia verificable.');
      run.reviewed = (run.reviewed || 0) + records.length;
      for (const record of records) {
        const id = `${sourceId}:${record.sourceId}`;
        const existing = base.documents.findIndex(item => item.id === id);
        const hash = documentHash(record);
        if (existing < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
        else if (documentHash(base.documents[existing]) !== hash) { base.documents[existing] = { ...base.documents[existing], ...record, hash, updatedAt: now }; run.updated++; }
        else { base.documents[existing].hash = hash; run.unchanged++; }
      }
    } catch (error) { run.errors.push({ message: `${volume.year}: ${error instanceof Error ? error.message : String(error)}` }); }
  }
  const source = base.sources.find(item => item.id === sourceId);
  if (source) source.lastImportedAt = now;
  else base.sources.push({ id: sourceId, name: sourceName, officialUrl: catalog, enabled: true, lastImportedAt: now });
  run.status = !run.reviewed ? 'failed' : run.errors.length ? 'partial' : 'completed';
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
