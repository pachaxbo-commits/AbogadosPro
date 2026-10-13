import { legalSyncStatus, syncLegalSources, type SyncSource } from '../server/legalSync.ts';

const action = process.argv[2] || 'status';
if (action === 'status') {
  console.log(JSON.stringify(await legalSyncStatus(), null, 2));
} else {
  const sources: SyncSource[] = action === 'all' ? ['agroambiental', 'mingobierno', 'tcp', 'mintrabajo', 'asfi', 'tsj-resumenes', 'agetic', 'contraloria']
    : action === 'agroambiental' || action === 'normativa' || action === 'tcp' || action === 'mintrabajo' || action === 'asfi' || action === 'tsj-resumenes' || action === 'agetic' || action === 'contraloria' ? [action === 'normativa' ? 'mingobierno' : action] : [];
  const page = Number(process.argv[3] || '1');
  const count = Number(process.argv[4] || (action === 'mintrabajo' ? '16' : '5'));
  if (!sources.length || !Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(count) || count < 1 || count > (action === 'mintrabajo' ? 16 : 10)) {
    throw new Error('Uso: npm run sync:legal -- status | all | agroambiental [página] [1-10 páginas] | normativa | tcp | mintrabajo [inicio] [1-16 páginas] | asfi | tsj-resumenes | agetic | contraloria');
  }
  const result = await syncLegalSources(sources, { agroPage: page, agroPages: count, laborPages: action === 'mintrabajo' ? count : 16 });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'completed') process.exitCode = 1;
}
