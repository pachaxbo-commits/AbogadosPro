import { randomUUID } from 'node:crypto';
import { documentHash, legalBasePath, readLegalBase, writeLegalBase, type LegalDocument, type LegalImportRun } from './legalBase.ts';

const sourceUrl = 'https://tcpbolivia.bo/';
const sourceId = 'tcp';
const sourceName = 'Tribunal Constitucional Plurinacional';
const sitemapUrl = 'https://tcpbolivia.bo/wp-sitemap-posts-page-1.xml';
const clean = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, ' ').trim();

export function parseTcpHighlights(html: string) {
  const records: Pick<LegalDocument, 'source' | 'sourceId' | 'kind' | 'number' | 'title' | 'tribunal' | 'matter' | 'year' | 'officialUrl' | 'indexableText' | 'keywords'>[] = [];
  for (const match of html.matchAll(/<div class="elementor-icon-box-content">([\s\S]*?<p class="elementor-icon-box-description">[\s\S]*?<\/p>)/g)) {
    const section = match[1];
    const title = clean(section.match(/<div class="elementor-icon-box-title">[\s\S]*?<a\s+href="[^"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '');
    const href = section.match(/<div class="elementor-icon-box-title">[\s\S]*?<a\s+href="([^"]+)"/i)?.[1];
    const excerpt = clean(section.match(/<p class="elementor-icon-box-description">([\s\S]*?)<\/p>/i)?.[1] || '');
    if (!href || !title || !excerpt) continue;
    let url: URL;
    try { url = new URL(href); } catch { continue; }
    const slug = url.pathname.split('/').filter(Boolean).at(-1) || '';
    if (url.protocol !== 'https:' || url.hostname !== 'tcpbolivia.bo' || !/^\d{3,5}-\d{4}-[a-z]\d+$/i.test(slug)) continue;
    const [number, year, chamber] = slug.split('-');
    records.push({ source: sourceName, sourceId: slug, kind: 'jurisprudencia',
      number: `${number}/${year}-${chamber.toUpperCase()}`, title, tribunal: sourceName,
      matter: title.split(' - ')[0]?.trim() || undefined, year, officialUrl: url.href,
      indexableText: excerpt, keywords: [] });
  }
  return [...new Map(records.map(record => [record.sourceId, record])).values()];
}

export function parseTcpSitemap(xml: string) {
  return [...xml.matchAll(/<loc>(https:\/\/tcpbolivia\.bo\/(\d{3,5}-\d{4}-s\d+)\/)\s*<\/loc>/gi)]
    .map(match => ({ url: match[1], slug: match[2] }));
}

export function parseTcpDecision(html: string, slug: string, url: string) {
  const heading = clean(html.match(/<h1[^>]*class="page-header-title[^"']*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const paragraph = clean(html.match(/<div class="field-item even">\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
  if (!heading || !paragraph || !/^\d{3,5}\/\d{4}-S\d+$/i.test(heading)) return undefined;
  const [number, year, chamber] = slug.split('-');
  return { source: sourceName, sourceId: slug, kind: 'jurisprudencia' as const,
    number: `${number}/${year}-${chamber.toUpperCase()}`, title: heading, tribunal: sourceName,
    year, officialUrl: url, indexableText: paragraph.slice(0, 450), keywords: [] };
}

export async function importTcpHighlights(path = legalBasePath, fetchPage: typeof fetch = fetch): Promise<LegalImportRun> {
  const base = await readLegalBase(path);
  const run: LegalImportRun = { id: randomUUID(), source: sourceId, page: 1, mode: 'page', status: 'running',
    startedAt: new Date().toISOString(), reviewed: 0, inserted: 0, updated: 0, unchanged: 0, errors: [] };
  try {
    const response = await fetchPage(sourceUrl, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok || new URL(response.url).hostname !== 'tcpbolivia.bo') throw new Error(`El portal oficial no respondió correctamente (${response.status}).`);
    const records = parseTcpHighlights((await response.text()).slice(0, 400000));
    try {
      const sitemap = await fetchPage(sitemapUrl, { headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(15000) });
      if (!sitemap.ok || new URL(sitemap.url).hostname !== 'tcpbolivia.bo') throw new Error(`Sitemap no disponible (${sitemap.status}).`);
      const entries = parseTcpSitemap((await sitemap.text()).slice(0, 50000));
      for (const [index, entry] of entries.entries()) {
        if (index && fetchPage === fetch) await new Promise(resolve => setTimeout(resolve, 800));
        try {
          const detail = await fetchPage(entry.url, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
          if (!detail.ok || new URL(detail.url).hostname !== 'tcpbolivia.bo') throw new Error(`Respuesta ${detail.status}.`);
          const record = parseTcpDecision((await detail.text()).slice(0, 400000), entry.slug, entry.url);
          if (record && !records.some(item => item.sourceId === record.sourceId)) records.push(record);
        } catch (error) { run.errors.push({ sourceId: entry.slug, message: error instanceof Error ? error.message : String(error) }); }
      }
    } catch (error) { run.errors.push({ message: `Sitemap TCP: ${error instanceof Error ? error.message : String(error)}` }); }
    run.reviewed = records.length;
    if (!records.length) throw new Error('No se encontraron sentencias destacadas reconocibles; no se modificó la base.');
    const now = new Date().toISOString();
    for (const record of records) {
      const id = `${sourceId}:${record.sourceId}`;
      const index = base.documents.findIndex(document => document.id === id);
      const hash = documentHash(record);
      if (index < 0) { base.documents.push({ ...record, id, hash, importedAt: now, updatedAt: now }); run.inserted++; }
      else if (documentHash(base.documents[index]) !== hash) {
        base.documents[index] = { ...base.documents[index], ...record, hash, updatedAt: now }; run.updated++;
      } else { base.documents[index].hash = hash; run.unchanged++; }
    }
    let source = base.sources.find(item => item.id === sourceId);
    if (!source) { source = { id: sourceId, name: sourceName, officialUrl: sourceUrl, enabled: true }; base.sources.push(source); }
    source.lastImportedAt = now;
    run.status = run.errors.length ? 'partial' : 'completed';
  } catch (error) { run.status = 'failed'; run.errors.push({ message: error instanceof Error ? error.message : 'Error de importación.' }); }
  run.finishedAt = new Date().toISOString();
  run.durationMs = Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  base.imports.push(run);
  await writeLegalBase(base, path);
  return run;
}
