import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const scenario = process.argv[2] || 'smoke';
mkdirSync('reports/k6', { recursive: true });
try {
  chmodSync('reports/k6', 0o777);
} catch {
  // Ignore permission error on Windows
}

function hasLocalK6() {
  try {
    execFileSync('k6', ['version'], { stdio: ['ignore', 'pipe', 'ignore'], shell: true });
    return true;
  } catch {
    return false;
  }
}

console.log(`=== SentinelQA Performance Execution: ${scenario} ===`);

if (hasLocalK6()) {
  console.log('Executing via local host k6 binary...');
  try {
    execFileSync(
      'k6',
      ['run', '--summary-export', 'reports/k6/summary.json', `performance/${scenario}.js`],
      { stdio: 'inherit', shell: true }
    );
  } catch (err) {
    console.error(`Performance test failed: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('Local k6 not found on PATH. Falling back to containerized execution via Docker Compose...');
  try {
    execFileSync(
      'docker',
      [
        'compose',
        '--profile',
        'perf',
        'run',
        '--rm',
        '--user',
        '0:0',
        'k6',
        'run',
        '--summary-export=/reports/k6/summary.json',
        `/performance/${scenario}.js`
      ],
      { stdio: 'inherit', shell: true }
    );
  } catch (err) {
    console.error(`Containerized k6 execution failed: ${err.message}`);
    process.exit(1);
  }
}

if (existsSync('reports/k6/summary.json')) {
  console.log('✅ Successfully generated reports/k6/summary.json');
} else {
  console.error('❌ reports/k6/summary.json was not generated.');
  process.exit(1);
}
