import { importAgroPage } from './agroImport.ts';
import { importNormativa } from './normativaImport.ts';
import { importTcpHighlights } from './tcpImport.ts';
import { importAsfiNorms, importLaborNorms } from './officialNormImport.ts';
import { importTsjSummaries } from './tsjSummaryImport.ts';
import { importAgeticNorms } from './ageticImport.ts';
import { importContraloriaNorms } from './contraloriaImport.ts';
import { legalBasePath, readLegalBase, writeLegalBase, type LegalImportRun } from './legalBase.ts';
import { randomUUID } from 'node:crypto';

export type SyncSource = 'agroambiental' | 'mingobierno' | 'tcp' | 'mintrabajo' | 'asfi' | 'tsj-resumenes' | 'agetic' | 'contraloria';
export interface SyncOptions {
  path?: string;
  agroPage?: number;
  agroPages?: number;
  fetchAgro?: typeof fetch;
  fetchNormativa?: typeof fetch;
  fetchTcp?: typeof fetch;
  fetchLabor?: typeof fetch;
  fetchAsfi?: typeof fetch;
  fetchTsj?: typeof fetch;
  fetchAgetic?: typeof fetch;
  fetchContraloria?: typeof fetch;
  laborPages?: number;
}

// Kept independent so a later scheduler can invoke either source without a UI or API key.
export async function syncLegalSource(source: SyncSource, options: SyncOptions = {}): Promise<LegalImportRun> {
  const path = options.path || legalBasePath;
  if (source === 'mingobierno') return importNormativa(path, options.fetchNormativa ?? fetch);
  if (source === 'tcp') return importTcpHighlights(path, options.fetchTcp ?? fetch);
  if (source === 'mintrabajo') return importLaborNorms(path, options.fetchLabor ?? fetch, options.laborPages ?? 16);
  if (source === 'asfi') return importAsfiNorms(path, options.fetchAsfi ?? fetch);
  if (source === 'tsj-resumenes') return importTsjSummaries(path, options.fetchTsj ?? fetch);
  if (source === 'agetic') return importAgeticNorms(path, options.fetchAgetic ?? fetch);
  if (source === 'contraloria') return importContraloriaNorms(path, options.fetchContraloria ?? fetch);
  const page = options.agroPage ?? 1;
  const count = options.agroPages ?? 5;
  if (!Number.isSafeInteger(count) || count < 1 || count > 10 || !Number.isSafeInteger(page) || page < 1 || page + count - 1 > 10000) throw new Error('Selecciona entre 1 y 10 páginas Agroambientales válidas.');
  if (count === 1) return importAgroPage(page, path, options.fetchAgro ?? fetch);
  const startedAt = new Date().toISOString();
  const pages: LegalImportRun[] = [];
  for (let offset = 0; offset < count; offset++) {
    if (offset && !options.fetchAgro) await new Promise(resolve => setTimeout(resolve, 1000));
    const run = await importAgroPage(page + offset, path, options.fetchAgro ?? fetch);
    pages.push(run);
    if (run.status === 'failed') break;
  }
  const finishedAt = new Date().toISOString();
  const summary: LegalImportRun = {
    id: randomUUID(), source, page, mode: 'batch', startedAt, finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
    reviewed: pages.reduce((total, run) => total + (run.reviewed ?? 0), 0),
    inserted: pages.reduce((total, run) => total + run.inserted, 0),
    updated: pages.reduce((total, run) => total + run.updated, 0),
    unchanged: pages.reduce((total, run) => total + run.unchanged, 0),
    errors: pages.flatMap(run => run.errors.map(error => ({ ...error, message: `Página ${run.page}: ${error.message}` }))),
    status: pages.every(run => run.status === 'completed') ? 'completed'
      : pages.every(run => run.status === 'failed') ? 'failed' : 'partial',
  };
  const base = await readLegalBase(path);
  base.imports.push(summary);
  await writeLegalBase(base, path);
  return summary;
}

export async function syncLegalSources(sources: SyncSource[], options: SyncOptions = {}) {
  const runs: LegalImportRun[] = [];
  for (const source of [...new Set(sources)]) {
    // Sequential writes prevent both importers from overwriting the same local JSON database.
    runs.push(await syncLegalSource(source, options));
  }
  return {
    status: runs.every(run => run.status === 'completed') ? 'completed'
      : runs.every(run => run.status === 'failed') ? 'failed' : 'partial',
    runs,
  } as const;
}

export async function legalSyncStatus(path = legalBasePath) {
  const base = await readLegalBase(path);
  const knownSources = [
    { id: 'agroambiental', name: 'Tribunal Agroambiental', officialUrl: 'https://arbol.tribunalagroambiental.bo/index.php?r=viewresolucion%2Flistaresoluciones', enabled: true },
    { id: 'mingobierno', name: 'Ministerio de Gobierno', officialUrl: 'https://web.mingobierno.gob.bo/?post_type=normativa', enabled: true },
    { id: 'tcp', name: 'Tribunal Constitucional Plurinacional', officialUrl: 'https://tcpbolivia.bo/', enabled: true },
    { id: 'mintrabajo', name: 'Ministerio de Trabajo', officialUrl: 'https://mintrabajo.gob.bo/index.php/normativa-externa/', enabled: true },
    { id: 'asfi', name: 'ASFI', officialUrl: 'https://www.asfi.gob.bo/pb/normativa-nacional', enabled: true },
    { id: 'tsj-resumenes', name: 'Tribunal Supremo de Justicia · resúmenes', officialUrl: 'https://tsj.bo/jurisprudencia/', enabled: true },
    { id: 'agetic', name: 'AGETIC · Normativa Nacional', officialUrl: 'https://agetic.gob.bo/normativa/normativa-nacional', enabled: true },
    { id: 'contraloria', name: 'Contraloría General del Estado', officialUrl: 'https://www.contraloria.gob.bo/biblioteca-normativa/', enabled: true },
  ];
  return knownSources.map(known => {
    const source = base.sources.find(item => item.id === known.id) || known;
    return {
    ...source,
    documents: base.documents.filter(document => document.id.startsWith(`${source.id}:`)).length,
    lastRun: base.imports.findLast(run => run.source === source.id && run.mode !== 'detail'),
    };
  });
}
