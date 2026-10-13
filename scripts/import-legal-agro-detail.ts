import { enrichAgroRecord } from '../server/agroImport.ts';

const run = await enrichAgroRecord(process.argv[2] || '');
console.log(JSON.stringify(run, null, 2));
if (run.status !== 'completed') process.exitCode = 1;
