import { importAgroPage } from '../server/agroImport.ts';

const page = Number(process.argv[2] || '1');
const run = await importAgroPage(page);
console.log(JSON.stringify(run, null, 2));
if (run.status !== 'completed') process.exitCode = 1;
