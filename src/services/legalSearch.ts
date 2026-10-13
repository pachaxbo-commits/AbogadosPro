export type LegalSearchKind = 'jurisprudencia' | 'normativa';
export type LegalSearchField = 'all' | 'title' | 'matter' | 'process' | 'synopsis' | 'keywords' | 'parties' | 'metadata';
export type LegalSearchSort = 'relevance' | 'newest' | 'oldest';

export interface LegalSearchFilters {
  source?: string;
  resolutionType?: string;
  matter?: string;
  tribunal?: string;
  topic?: string;
  chamber?: string;
  reference?: string;
  fromDate?: string;
  toDate?: string;
  searchField?: LegalSearchField;
  exactPhrase?: boolean;
  requiredTerms?: string;
  excludedTerms?: string;
  sort?: LegalSearchSort;
}

export interface LegalSearchResult {
  title: string;
  url: string;
  source: string;
  kind: LegalSearchKind;
  verification: 'official-reference';
  number?: string;
  year?: string;
  resolutionType?: string;
  tribunal?: string;
  chamber?: string;
  matter?: string;
  date?: string;
  issuer?: string;
  process?: string;
  snippet?: string;
  matchField?: string;
  matchExcerpt?: string;
  relevance?: 'strong' | 'medium' | 'low';
  relevanceScore?: number;
  bestMatch?: boolean;
  highlightTerms?: string[];
  matchReason?: string;
}

export interface LegalSearchResponse {
  results: LegalSearchResult[];
  failedSources: string[];
  notice: string;
}

export function hasLegalSearchCriteria(filters: LegalSearchFilters) {
  return Boolean([
    filters.source, filters.resolutionType, filters.matter, filters.tribunal,
    filters.topic, filters.chamber, filters.reference, filters.fromDate, filters.toDate,
    filters.requiredTerms, filters.excludedTerms,
  ].some(value => value?.trim()));
}

export async function searchLegalSources(kind: LegalSearchKind, query: string, filters: LegalSearchFilters): Promise<LegalSearchResponse> {
  if (!(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) return { results: [], failedSources: [], notice: 'La búsqueda jurídica real está habilitada solo en localhost. No se consultó ninguna fuente.' };
  const response = await fetch('/api/legal-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, query, filters }),
  });
  if (!response.ok) throw new Error('No se pudo consultar la búsqueda jurídica. Inténtalo de nuevo.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) {
    throw new Error('La búsqueda jurídica devolvió una respuesta inválida.');
  }
  return data as LegalSearchResponse;
}
