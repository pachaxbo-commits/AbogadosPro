import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { hasLegalSearchCriteria } from '../src/services/legalSearch.ts';
import type { LegalSearchField, LegalSearchFilters, LegalSearchKind, LegalSearchResponse, LegalSearchResult } from '../src/services/legalSearch.ts';

export interface LegalDocument {
  id: string;
  source: string;
  sourceId: string;
  kind: LegalSearchKind;
  number?: string;
  title: string;
  tribunal?: string;
  chamber?: string;
  matter?: string;
  date?: string;
  year?: string;
  resolutionType?: string;
  documentType?: string;
  issuer?: string;
  caseFile?: string;
  process?: string;
  district?: string;
  reportingJudge?: string;
  claimant?: string;
  respondents?: string;
  officialUrl: string;
  indexableText?: string;
  keywords: string[];
  importedAt: string;
  updatedAt: string;
  hash: string;
}

export interface LegalImportRun {
  id: string;
  source: string;
  page: number;
  mode?: 'page' | 'detail' | 'batch';
  sourceId?: string;
  status: 'running' | 'completed' | 'partial' | 'failed';
  startedAt: string;
  finishedAt?: string;
  reviewed?: number;
  durationMs?: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: { sourceId?: string; message: string }[];
}

export interface LegalSource {
  id: string;
  name: string;
  officialUrl: string;
  enabled: boolean;
  lastImportedAt?: string;
}

export interface LegalBase { version: 1; sources: LegalSource[]; documents: LegalDocument[]; imports: LegalImportRun[] }

export const legalBasePath = resolve(process.cwd(), '.local-data', 'legal-base.json');
export const legalSeedPath = resolve(process.cwd(), 'server', 'data', 'legal-base.seed.json');
const emptyBase = (): LegalBase => ({ version: 1, sources: [{ id: 'agroambiental', name: 'Tribunal Agroambiental', officialUrl: 'https://arbol.tribunalagroambiental.bo/index.php?r=viewresolucion%2Flistaresoluciones', enabled: true }], documents: [], imports: [] });

async function readStoredBase(path: string): Promise<LegalBase | null> {
  try {
    const data: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (data && typeof data === 'object' && 'version' in data && data.version === 1 && 'documents' in data && Array.isArray(data.documents) && 'imports' in data && Array.isArray(data.imports) && 'sources' in data && Array.isArray(data.sources)) return data as LegalBase;
    throw new Error('La base jurídica tiene un formato inválido.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function readLegalBase(path = legalBasePath): Promise<LegalBase> {
  // A custom path is an isolated repository (used by importers and tests).
  if (path !== legalBasePath) return (await readStoredBase(path)) || emptyBase();
  return readSharedLegalBase(path, legalSeedPath);
}

export async function readSharedLegalBase(overlayPath: string, seedPath: string): Promise<LegalBase> {
  const [stored, seed] = await Promise.all([readStoredBase(overlayPath), readStoredBase(seedPath)]);
  if (!seed) throw new Error('No se encontró el corpus jurídico global incluido en el proyecto.');
  if (!stored) return seed;
  // The server-side overlay contains manual syncs. Seed updates remain visible
  // to every browser without overwriting records already refreshed locally.
  return {
    version: 1,
    sources: [...new Map([...seed.sources, ...stored.sources].map(source => [source.id, source])).values()],
    documents: [...new Map([...seed.documents, ...stored.documents].map(document => [document.id, document])).values()],
    imports: [...new Map([...seed.imports, ...stored.imports].map(run => [run.id, run])).values()],
  };
}

export async function writeLegalBase(base: LegalBase, path = legalBasePath) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(base, null, 2), 'utf8');
  await rename(temporary, path);
}

export function documentHash(document: Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'tribunal' | 'chamber' | 'matter' | 'date' | 'year' | 'resolutionType' | 'documentType' | 'issuer' | 'caseFile' | 'process' | 'district' | 'reportingJudge' | 'claimant' | 'respondents' | 'officialUrl' | 'indexableText' | 'keywords'>) {
  const fields = ['source', 'sourceId', 'kind', 'number', 'title', 'tribunal', 'chamber', 'matter', 'date', 'year', 'resolutionType', 'documentType', 'issuer', 'caseFile', 'process', 'district', 'reportingJudge', 'claimant', 'respondents', 'officialUrl', 'indexableText', 'keywords'] as const;
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(fields.map(field => [field, document[field]])))).digest('hex');
}

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/\b(contratos|medidas|procesos|resoluciones|normas|sentencias|documentos)\b/g, word => ({
    contratos: 'contrato', medidas: 'medida', procesos: 'proceso', resoluciones: 'resolucion',
    normas: 'norma', sentencias: 'sentencia', documentos: 'documento',
  })[word as 'contratos' | 'medidas' | 'procesos' | 'resoluciones' | 'normas' | 'sentencias' | 'documentos']);

const queryVariants = (query: string) => {
  const normalized = fold(query).replace(/^d s (?=\d)/, 'decreto supremo ').replace(/^ds (?=\d)/, 'decreto supremo ');
  const equivalents: [string, string][] = [
    ['asistencia familiar', 'pension familiar'],
    ['despido injustificado', 'despido ilegal'],
    ['falta de fundamentacion', 'falta de motivacion'],
    ['divorcio', 'disolucion matrimonial'],
    ['medida cautelares', 'medida cautelar'],
  ];
  const variants = [normalized];
  for (const [left, right] of equivalents) {
    if (normalized.includes(left)) variants.push(normalized.replace(left, right));
    else if (normalized.includes(right)) variants.push(normalized.replace(right, left));
  }
  return [...new Set(variants)].map(value => value.split(' ').filter(Boolean));
};

type SearchField = Exclude<LegalSearchField, 'all'>;
const fieldNames: Record<SearchField, string> = {
  title: 'Título', matter: 'Materia', process: 'Proceso', synopsis: 'Síntesis / extracto indexado',
  keywords: 'Palabras clave / tema', parties: 'Partes', metadata: 'Metadatos',
};
type FieldValue = { raw: string; folded: string };
type SearchEntry = { document: LegalDocument; fields: Record<SearchField, FieldValue> };
type RankedHit = { document: LegalDocument; matter: string; score: number; matchField?: string;
  matchExcerpt?: string; relevance?: LegalSearchResult['relevance']; matchReason: string; highlightTerms?: string[] };
type FieldHit = { field: SearchField; value: FieldValue; needle: string; score: number;
  mode: 'phrase' | 'all' | 'combined' | 'partial'; terms: string[] };
const searchCache = new Map<string, { version: string; entries: SearchEntry[] }>();

function fieldsOf(document: LegalDocument): SearchEntry['fields'] {
  // The TSJ summary importer stores its source-derived synopsis first, then the
  // descriptor, separated by a dot. No ratio decidendi is stored separately.
  const tsjSummary = document.sourceId.startsWith('2022:') || document.sourceId.startsWith('2023:');
  const segments = tsjSummary && document.source === 'Tribunal Supremo de Justicia · resúmenes'
    ? (document.indexableText || '').split(' · ') : [];
  // Some TSJ entries include an explicit labor-law descriptor even when the
  // imported matter field was empty. Use that descriptor, not an inferred topic.
  const matter = document.matter || (tsjSummary && /\bDERECHO (?:DEL TRABAJO|LABORAL)\b/i.test(segments[1] || '') ? 'Laboral' : '');
  const values: Record<SearchField, string> = {
    title: document.title,
    matter,
    process: document.process || '',
    synopsis: segments[0] || document.indexableText || '',
    keywords: segments.length ? segments[1] || '' : document.keywords.join(' '),
    parties: [document.claimant, document.respondents].filter(Boolean).join(' '),
    metadata: [document.number, document.source, document.sourceId, document.tribunal, document.chamber,
      document.resolutionType, document.documentType, document.issuer, document.caseFile,
      document.district, document.reportingJudge, document.year, ...segments.slice(2),
      ...(segments.length ? document.keywords : [])].filter(Boolean).join(' '),
  };
  return Object.fromEntries(Object.entries(values).map(([key, raw]) => [key, { raw, folded: fold(raw) }])) as SearchEntry['fields'];
}

function hasPhrase(haystack: string, needle: string) {
  return Boolean(needle && (` ${haystack} `).includes(` ${needle} `));
}

function hasWords(haystack: string, words: string[]) {
  return words.every(word => hasPhrase(haystack, word));
}

function tribunalMatches(actual: string | undefined, requested: string) {
  const name = fold(actual || '');
  const term = fold(requested);
  const officialNames: Record<string, string> = {
    tsj: 'tribunal supremo de justicia',
    tcp: 'tribunal constitucional plurinacional',
  };
  return name.includes(officialNames[term] || term);
}

function bestFieldHit(fields: SearchEntry['fields'], variants: string[][], exact: boolean,
  normalized: string, selectedField: LegalSearchField, allowPartial = false): FieldHit | undefined {
  const searchFields = selectedField === 'all' ? Object.entries(fields) as [SearchField, FieldValue][]
    : [[selectedField, fields[selectedField]] as [SearchField, FieldValue]];
  const weights: Record<SearchField, number> = {
    title: 220, matter: 200, process: 190, keywords: 180,
    synopsis: 165, parties: 105, metadata: 75,
  };
  const hits: FieldHit[] = [];
  for (const [field, value] of searchFields) {
    if (!value.folded) continue;
    for (const [variantIndex, words] of variants.entries()) {
      if (!words.length) continue;
      const phrase = words.join(' ');
      if (exact && !hasPhrase(value.folded, normalized)) continue;
      if (hasPhrase(value.folded, phrase)) {
        hits.push({ field, value, needle: phrase, terms: words, mode: 'phrase', score: weights[field] + 40 + words.length * 5 + (variantIndex === 0 ? 12 : 0) });
      } else if (!exact && hasWords(value.folded, words)) {
        hits.push({ field, value, needle: phrase, terms: words, mode: 'all', score: weights[field] + words.length * 5 + (variantIndex === 0 ? 12 : 0) });
      } else if (allowPartial && !exact && (field === 'keywords' || field === 'metadata')) {
        const principal = words.filter(word => word.length >= 4 && !['para', 'sobre', 'entre', 'desde'].includes(word));
        const found = principal.filter(word => hasPhrase(value.folded, word));
        if (principal.length >= 3 && found.length >= Math.max(2, Math.ceil(principal.length * 0.67)) && found.length < principal.length) {
          hits.push({ field, value, needle: found.join(' '), terms: found, mode: 'partial', score: (field === 'keywords' ? 70 : 40) + found.length * 5 + (variantIndex === 0 ? 12 : 0) });
        }
      }
    }
  }
  if (!exact && selectedField === 'all') {
    for (const words of variants) {
      if (words.length < 2 || !words.every(word => searchFields.some(([, value]) => hasPhrase(value.folded, word)))) continue;
      const [field, value] = [...searchFields].sort((a, b) =>
        words.filter(word => hasPhrase(b[1].folded, word)).length - words.filter(word => hasPhrase(a[1].folded, word)).length)[0];
      const found = words.filter(word => hasPhrase(value.folded, word));
      hits.push({ field, value, needle: found.join(' '), terms: found, mode: 'combined', score: 110 + words.length * 5 });
    }
  }
  return hits.sort((a, b) => b.score - a.score)[0];
}

function excerpt(raw: string, needle: string) {
  const words = [...raw.matchAll(/[\p{L}\p{N}]+/gu)].map(match => ({
    folded: fold(match[0]), start: match.index, end: match.index + match[0].length,
  }));
  const wanted = needle.split(' ').filter(Boolean);
  let at = words.findIndex((_, index) => wanted.every((part, offset) => words[index + offset]?.folded === part));
  if (at < 0) at = words.findIndex(word => wanted.includes(word.folded));
  if (at < 0) return raw.slice(0, 240);
  const start = Math.max(0, words[at].start - 65);
  const end = Math.min(raw.length, words[Math.min(words.length - 1, at + wanted.length - 1)].end + 125);
  return `${start ? '…' : ''}${raw.slice(start, end).trim()}${end < raw.length ? '…' : ''}`;
}

function dateInRange(document: LegalDocument, from?: string, to?: string) {
  if (!from && !to) return true;
  if (document.date) return (!from || document.date >= from) && (!to || document.date <= to);
  // A year-only record can be included only when the entire year lies inside
  // the requested range; a narrow date range cannot establish its exact date.
  if (!document.year || !/^\d{4}$/.test(document.year)) return false;
  return (!from || `${document.year}-01-01` >= from) && (!to || `${document.year}-12-31` <= to);
}

async function readSearchEntries(path: string): Promise<SearchEntry[]> {
  const paths = path === legalBasePath ? [legalSeedPath, path] : [path];
  const version = (await Promise.all(paths.map(async filePath => {
    try {
      const file = await stat(filePath, { bigint: true });
      return `${file.mtimeNs}:${file.ctimeNs}:${file.size}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
      throw error;
    }
  }))).join('|');
  const cached = searchCache.get(path);
  if (cached?.version === version) return cached.entries;
  const entries = (await readLegalBase(path)).documents.map(document => ({ document, fields: fieldsOf(document) }));
  searchCache.set(path, { version, entries });
  return entries;
}

export async function searchLegalBase(kind: LegalSearchKind, query: string, filters: LegalSearchFilters = {}, path = legalBasePath): Promise<LegalSearchResponse> {
  const entries = await readSearchEntries(path);
  const quoted = /^\s*"(.+)"\s*$/.exec(query);
  const exact = filters.exactPhrase || Boolean(quoted);
  const normalized = fold(quoted?.[1] || query);
  if (!normalized && !hasLegalSearchCriteria(filters)) return { results: [], failedSources: [], notice: 'Escribe una consulta o selecciona al menos un filtro.' };
  const variants = exact ? [normalized.split(' ').filter(Boolean)] : queryVariants(query);
  const selectedField: LegalSearchField = filters.searchField && [...Object.keys(fieldNames), 'all'].includes(filters.searchField)
    ? filters.searchField : 'all';
  const required = fold(filters.requiredTerms || '').split(' ').filter(Boolean);
  const excluded = fold(filters.excludedTerms || '');
  const sort = filters.sort || 'relevance';
  const ranked = entries.flatMap<RankedHit>(entry => {
    const { document, fields } = entry;
    if (document.kind !== kind) return [];
    if (filters.source && fold(document.source) !== fold(filters.source)) return [];
    if (filters.resolutionType && !fold(document.resolutionType || document.documentType || '').includes(fold(filters.resolutionType))) return [];
    if (filters.matter && !fields.matter.folded.includes(fold(filters.matter))) return [];
    if (filters.tribunal && !tribunalMatches(document.tribunal, filters.tribunal)) return [];
    if (filters.chamber && !fold(document.chamber || '').includes(fold(filters.chamber))) return [];
    if (filters.reference && !hasPhrase(fold([document.number, document.sourceId, document.caseFile].filter(Boolean).join(' ')), fold(filters.reference))) return [];
    if (!dateInRange(document, filters.fromDate, filters.toDate)) return [];
    const topic = fold(filters.topic || '');
    const topicHit = topic ? bestFieldHit(fields, queryVariants(filters.topic || ''), false, topic, 'all') : undefined;
    if (topic && !topicHit) return [];
    const allText = Object.values(fields).map(field => field.folded).join(' ');
    if (required.length && !hasWords(allText, required)) return [];
    if (excluded && hasPhrase(allText, excluded)) return [];
    const best = normalized ? bestFieldHit(fields, variants, exact, normalized, selectedField, true) : topicHit;
    if (normalized && !best) return [];
    if (!best) return [{ document, matter: fields.matter.raw, score: 0,
      matchField: undefined, matchExcerpt: undefined, relevance: undefined,
      matchReason: 'Cumple los filtros seleccionados' }];
    const referenceMatch = Boolean(normalized && (selectedField === 'all' || selectedField === 'metadata') && hasPhrase(fold(document.number || ''), normalized));
    const referenceWins = referenceMatch && best.score < 215;
    const baseScore = referenceWins ? 215 : best.score;
    const score = baseScore + required.length * 8 + (normalized && topicHit ? Math.round(topicHit.score / 5) : 0);
    const reason = referenceWins ? 'Coincidencia exacta en Número / referencia'
      : best.mode === 'phrase' ? `Coincidencia exacta en ${fieldNames[best.field]}`
        : best.mode === 'all' ? `${best.terms.length} términos principales en ${fieldNames[best.field]}`
          : best.mode === 'combined' ? `${variants[0].length} términos principales encontrados`
            : `Coincidencia parcial en ${fieldNames[best.field]} · ${best.terms.length} términos encontrados`;
    return [{ document, matter: fields.matter.raw, score,
      matchField: referenceWins ? 'Número / referencia' : fieldNames[best.field],
      matchExcerpt: excerpt(referenceWins ? document.number || '' : best.value.raw, referenceWins ? normalized : best.needle),
      highlightTerms: referenceWins ? normalized.split(' ') : best.terms,
      relevance: score >= 200 ? 'strong' as const : score >= 130 ? 'medium' as const : 'low' as const,
      matchReason: `${normalized ? '' : 'Tema: '}${reason}${normalized && topicHit ? ' · Tema relacionado' : ''}${required.length ? ` · ${required.length} ${required.length === 1 ? 'término obligatorio encontrado' : 'términos obligatorios encontrados'}` : ''}` }];
  });
  const dateKey = (document: LegalDocument) => document.date || (document.year ? `${document.year}-01-01` : '');
  ranked.sort((a, b) => sort === 'newest'
    ? dateKey(b.document).localeCompare(dateKey(a.document)) || b.score - a.score
    : sort === 'oldest' ? (dateKey(a.document) || '9999').localeCompare(dateKey(b.document) || '9999') || b.score - a.score
      : b.score - a.score || dateKey(b.document).localeCompare(dateKey(a.document)) || a.document.id.localeCompare(b.document.id));
  // Official institutions may republish the same national law or decree. Keep
  // every source record, but show the highest-ranked copy only in a broad search.
  const seenNationalNorms = new Set<string>();
  const uniqueRanked = ranked.filter(({ document }) => {
    if (document.kind !== 'normativa' || !document.number) return true;
    const type = fold(document.documentType || '');
    if (type !== 'ley' && type !== 'decreto supremo') return true;
    const number = document.number.replace(/^0+/, '');
    if (!/^\d+$/.test(number)) return true;
    const key = `${type}:${number}`;
    if (seenNationalNorms.has(key)) return false;
    seenNationalNorms.add(key);
    return true;
  });
  const clearWinner = sort === 'relevance' && uniqueRanked.length > 1 && uniqueRanked[0].score >= 200 && uniqueRanked[0].score - uniqueRanked[1].score >= 35;
  const results: LegalSearchResult[] = uniqueRanked.slice(0, 50).map(({ document, matter, score, matchField, matchExcerpt, relevance, matchReason, highlightTerms }, index) => ({
    title: document.title, number: document.number, year: document.year, resolutionType: document.documentType || document.resolutionType,
    tribunal: document.tribunal, chamber: document.chamber, matter: matter || undefined, date: document.date,
    issuer: document.issuer, process: document.process,
    snippet: document.indexableText?.slice(0, 240),
    matchField, matchExcerpt, relevance: relevance || 'low', relevanceScore: score,
    bestMatch: clearWinner && index === 0, highlightTerms, matchReason,
    url: document.officialUrl, source: document.source, kind: document.kind, verification: 'official-reference',
  }));
  return { results, failedSources: [], notice: results.length ? `Resultados de la base jurídica compartida (${results.length}). Verifica siempre el documento original.` : 'No se encontraron resultados en la base jurídica compartida.' };
}
