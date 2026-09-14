import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { selectTests } from './selection.js';

const args = process.argv.slice(2);
function arg(name: string, fallback?: string) {
  const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1];
}
try {
  const list = arg('--files');
  let files: string[], fallbackReason: string | undefined;
  if (list) files = JSON.parse(readFileSync(list, 'utf8'));
  else {
    try {
      const base = arg('--base', 'origin/main')!, head = arg('--head', 'HEAD')!;
      if (base.startsWith('-') || head.startsWith('-')) throw new Error('Git refs cannot begin with a dash');
      files = execFileSync('git', ['diff', '--name-only', '-z', `${base}...${head}`, '--'], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).split('\0').filter(Boolean);
    } catch { files = ['__UNKNOWN_GIT_BASE__']; fallbackReason = 'Git comparison unavailable; running full catalog is required.'; }
  }
  if (!Array.isArray(files) || files.some(f => typeof f !== 'string')) throw new Error('--files must contain a JSON string array');
  const result = { ...selectTests(files, parse(readFileSync('quality/test-catalog.yml', 'utf8')), parse(readFileSync('quality/component-map.yml', 'utf8'))), fallbackReason };
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/test-selection.json', JSON.stringify(result, null, 2));
  console.log(`${result.riskLevel} risk (${result.score}/25): ${result.selectedTests.length} tests selected. ${result.runBroaderSuite ? 'Full catalog required.' : ''}`);
  result.selectedTests.forEach(test => console.log(`${test.id}: ${test.reasons.join(' ')}`));
} catch (error) { console.error(error instanceof Error ? error.message : 'Selection failed'); process.exitCode = 1; }
