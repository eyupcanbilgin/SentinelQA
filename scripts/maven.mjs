import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backend = fileURLToPath(new URL('../backend/', import.meta.url));
const result = spawnSync(process.platform === 'win32' ? 'mvn.cmd' : 'mvn', process.argv.slice(2), {
  cwd: backend, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
