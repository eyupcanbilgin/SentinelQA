import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { selectTests, generateTestPlan } from './selection.js';

const args = process.argv.slice(2);
function arg(name: string, fallback?: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function refExists(ref: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function getDefaultRemoteHead(): string | null {
  try {
    const out = execFileSync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out.replace(/^refs\/remotes\//, '');
  } catch {
    return null;
  }
}

function resolveBaseRef(explicitBase?: string): string | null {
  if (explicitBase) {
    if (refExists(explicitBase)) return explicitBase;
    throw new Error(`Explicitly provided --base ref "${explicitBase}" does not exist in git.`);
  }
  if (process.env.GITHUB_BASE_REF) {
    const ghRemoteRef = `origin/${process.env.GITHUB_BASE_REF}`;
    if (refExists(ghRemoteRef)) return ghRemoteRef;
    if (refExists(process.env.GITHUB_BASE_REF)) return process.env.GITHUB_BASE_REF;
  }
  const defaultRemote = getDefaultRemoteHead();
  if (defaultRemote && refExists(defaultRemote)) return defaultRemote;
  if (refExists('origin/master')) return 'origin/master';
  if (refExists('master')) return 'master';
  if (refExists('origin/main')) return 'origin/main';
  if (refExists('main')) return 'main';
  return null;
}

try {
  const list = arg('--files');
  const changedArg = arg('--changed');
  let files: string[];
  let fallbackReason: string | undefined;
  let resolvedBase: string | null = null;
  const head = arg('--head', 'HEAD')!;

  if (list) {
    files = JSON.parse(readFileSync(list, 'utf8'));
    console.log(`Input source: --files list (${files.length} changed files)`);
  } else if (changedArg) {
    files = [changedArg];
    console.log(`Input source: --changed direct input (${changedArg})`);
  } else {
    try {
      const explicitBase = arg('--base');
      resolvedBase = resolveBaseRef(explicitBase);

      if (!resolvedBase) {
        throw new Error('No valid base branch found (checked GITHUB_BASE_REF, origin/HEAD, origin/master, origin/main).');
      }
      if (resolvedBase.startsWith('-') || head.startsWith('-')) {
        throw new Error('Git refs cannot begin with a dash');
      }

      files = execFileSync('git', ['diff', '--name-only', '-z', `${resolvedBase}...${head}`, '--'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .split('\0')
        .filter(Boolean);

      console.log(`Base ref: ${resolvedBase}`);
      console.log(`Head ref: ${head}`);
    } catch (err) {
      files = ['__UNKNOWN_GIT_BASE__'];
      fallbackReason = `Git comparison unavailable (${(err as Error).message}); running full catalog is required for safety.`;
      console.warn(`Warning: ${fallbackReason}`);
    }
  }

  if (!Array.isArray(files) || files.some(f => typeof f !== 'string')) {
    throw new Error('--files must contain a JSON string array');
  }

  const selectionResult = selectTests(
    files,
    parse(readFileSync('quality/test-catalog.yml', 'utf8')),
    parse(readFileSync('quality/component-map.yml', 'utf8'))
  );

  const result = { ...selectionResult, fallbackReason, baseRef: resolvedBase, headRef: head };
  const testPlan = generateTestPlan(selectionResult);

  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/test-selection.json', JSON.stringify(result, null, 2) + '\n');
  writeFileSync('reports/test-plan.json', JSON.stringify(testPlan, null, 2) + '\n');

  console.log(`Changed files: ${files.length}`);
  console.log(`Affected components: ${result.affectedComponents.join(', ') || 'none'}`);
  console.log(`Risk: ${result.riskLevel}`);
  console.log(
    `${result.riskLevel} risk (${result.score}/25): ${result.selectedTests.length} tests selected. ${
      result.runBroaderSuite ? 'Full catalog required.' : ''
    }`
  );
  result.selectedTests.forEach(test => console.log(`${test.id}: ${test.reasons.join(' ')}`));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Selection failed');
  process.exitCode = 1;
}
