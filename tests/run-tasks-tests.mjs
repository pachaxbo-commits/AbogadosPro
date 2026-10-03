import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'node_modules', '.tmp', 'task-tests');
const sources = ['repositories/firestoreRepo.ts', 'services/reminders.ts', 'services/finance.ts', 'services/formatters.ts', 'services/taskNotifications.ts', 'services/phone.ts', 'repositories/appearanceRepository.ts', 'types/profile.ts', 'services/whatsapp.ts', 'services/profile.ts', 'repositories/profileRepository.ts', 'types/index.ts', 'repositories/types.ts', 'repositories/localStorageRepo.ts', 'repositories/documentsRepository.ts', 'data/initialMockData.ts', 'data/taskDemoData.ts', 'services/tasks.ts', 'services/eventResults.ts', 'services/calendarService.ts', 'services/documents.ts', 'services/documentFiles.ts'];
for (const source of sources) {
  const dest = path.join(output, source.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src', source), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  fs.writeFileSync(dest, compiled.outputText);
}
fs.writeFileSync(path.join(output, 'package.json'), '{"type":"commonjs"}');
const result = spawnSync(process.execPath, ['--test', ...(process.argv.slice(2).length ? process.argv.slice(2) : ['tests/round.test.mjs', 'tests/active-repository.test.mjs', 'tests/profile.test.mjs', 'tests/tasks.test.mjs', 'tests/documents.test.mjs', 'tests/event-results.test.mjs', 'tests/calendar.test.mjs'])], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;


