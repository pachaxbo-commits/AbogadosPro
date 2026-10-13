import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LegalSearchFilters, LegalSearchKind, LegalSearchResponse, LegalSearchResult } from '../src/services/legalSearch.ts';

type Provider = {
  source: string;
  kind: LegalSearchKind;
  search(query: string, filters: LegalSearchFilters): Promise<LegalSearchResult[]>;
};

const unescapeText = (value: string) => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]*>/g, '')
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

async function publicPage(url: URL): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'text/html, application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`El portal respondió ${response.status}`);
  if (response.url && new URL(response.url).hostname !== url.hostname) throw new Error('El portal redirigió fuera de su dominio');
  return (await response.text()).slice(0, 400000);
}

async function publicJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`El portal respondió ${response.status}`);
  if (response.url && new URL(response.url).hostname !== url.hostname) throw new Error('El portal redirigió fuera de su dominio');
  return response.json();
}

function officialLink(raw: string, host: string): string | null {
  try {
    const url = new URL(unescapeText(raw), `https://${host}`);
    return url.protocol === 'https:' && url.hostname === host ? url.href : null;
  } catch { return null; }
}

const agroambiental: Provider = {
  source: 'Tribunal Agroambiental', kind: 'jurisprudencia',
  async search(query, filters) {
    const url = new URL('https://arbol.tribunalagroambiental.bo/index.php');
    url.searchParams.set('r', 'viewresolucion/listaresoluciones');
    url.searchParams.set('ViewresolucionSearch[resolucion]', query);
    if (filters.resolutionType) url.searchParams.set('ViewresolucionSearch[tipo]', filters.resolutionType.slice(0, 50));
    const html = await publicPage(url);
    const rows = [...html.matchAll(/<tr data-key="\d+">([\s\S]*?)<\/tr>/g)].slice(0, 10);
    return rows.flatMap(([, row]) => {
      const fields = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => unescapeText(match[1]));
      const href = row.match(/<a href="([^"]+)" title="Resolución"/i)?.[1];
      const link = href && officialLink(href, 'arbol.tribunalagroambiental.bo');
      if (!link || fields.length < 5 || !fields[1]) return [];
      return [{
        title: fields[1], number: fields[2] || undefined, year: fields[3] || undefined,
        resolutionType: fields[4] || undefined, url: link,
        source: 'Tribunal Agroambiental', kind: 'jurisprudencia' as const,
        verification: 'official-reference' as const,
      }];
    });
  },
};

const gobiernoNormativa: Provider = {
  source: 'Ministerio de Gobierno', kind: 'normativa',
  async search(query) {
    const url = new URL('https://web.mingobierno.gob.bo/index.php');
    url.searchParams.set('rest_route', '/wp/v2/normativa');
    url.searchParams.set('search', query);
    url.searchParams.set('per_page', '10');
    const data = await publicJson(url);
    if (!Array.isArray(data)) throw new Error('El portal no devolvió una lista de normas');
    return data.slice(0, 10).flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as { title?: { rendered?: string }; link?: string; type?: string; status?: string };
      const title = unescapeText(item.title?.rendered || '');
      const link = item.link && officialLink(item.link, 'web.mingobierno.gob.bo');
      if (!title || !link || item.type !== 'normativa' || item.status !== 'publish' || !new URL(link).searchParams.has('normativa')) return [];
      return [{
        title, url: link, source: 'Ministerio de Gobierno', kind: 'normativa' as const,
        verification: 'official-reference' as const,
      }];
    });
  },
};

const providers: Provider[] = [agroambiental, gobiernoNormativa];

export async function runLegalSearch(input: unknown): Promise<LegalSearchResponse> {
  if (!input || typeof input !== 'object') throw new Error('Consulta inválida.');
  const request = input as { kind?: unknown; query?: unknown; filters?: LegalSearchFilters };
  if (request.kind !== 'jurisprudencia' && request.kind !== 'normativa') throw new Error('Selecciona jurisprudencia o normativa.');
  if (typeof request.query !== 'string' || !request.query.trim() || request.query.length > 200) throw new Error('Escribe una consulta de hasta 200 caracteres.');
  const query = request.query.trim();
  const filters = request.filters && typeof request.filters === 'object' ? request.filters : {};
  const matching = providers.filter(provider => provider.kind === request.kind);
  const settled = await Promise.allSettled(matching.map(provider => provider.search(query, filters)));
  const results = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const failedSources = settled.flatMap((result, index) => result.status === 'rejected' ? [matching[index].source] : []);
  const notice = request.kind === 'jurisprudencia'
    ? 'Búsqueda limitada a referencias y tipos de resoluciones agroambientales; no consulta el texto completo. TCP y TSJ/Génesis no tienen integración pública segura disponible.'
    : 'Búsqueda limitada al catálogo público del Ministerio de Gobierno. La Gaceta Oficial no respondió de forma estable a consultas automáticas.';
  return { results, failedSources, notice: `${notice}${failedSources.length ? ` No respondió: ${failedSources.join(', ')}.` : ''}${!results.length ? ' No se encontraron referencias en las fuentes disponibles.' : ''}` };
}

export async function handleLocalLegalSearch(request: IncomingMessage, response: ServerResponse) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    let body = '';
    for await (const chunk of request) {
      body += chunk.toString();
      if (body.length > 8000) throw new Error('La consulta es demasiado extensa.');
    }
    response.statusCode = 200;
    response.end(JSON.stringify(await runLegalSearch(JSON.parse(body))));
  } catch (error) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Error de búsqueda.' }));
  }
}
