import { importNormativa } from '../server/normativaImport.ts';

const run = await importNormativa();
console.log(JSON.stringify(run, null, 2));
if (run.status !== 'completed') process.exitCode = 1;
