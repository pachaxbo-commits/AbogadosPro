import type { IncomingMessage, ServerResponse } from 'node:http';
import { searchLegalBase } from './legalBase.ts';
import { hasLegalSearchCriteria } from '../src/services/legalSearch.ts';
import type { LegalSearchFilters, LegalSearchKind } from '../src/services/legalSearch.ts';

export async function handleLocalLegalSearch(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk.toString();
      if (body.length > 8000) throw new Error('La consulta es demasiado extensa.');
    }
    const input: unknown = JSON.parse(body);
    if (!input || typeof input !== 'object') throw new Error('Consulta inválida.');
    const { kind, query, filters } = input as { kind?: LegalSearchKind; query?: string; filters?: LegalSearchFilters };
    if (kind !== 'jurisprudencia' && kind !== 'normativa') throw new Error('Selecciona jurisprudencia o normativa.');
    if (typeof query !== 'string' || query.length > 200 || (!query.trim() && !hasLegalSearchCriteria(filters || {}))) throw new Error('Escribe una consulta o selecciona al menos un filtro.');
    response.statusCode = 200;
    response.end(JSON.stringify(await searchLegalBase(kind, query.trim(), filters)));
  } catch (error) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Error de búsqueda.' }));
  }
}
