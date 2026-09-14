import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateGate, markdown, readConfig, validateManifest } from './gate.js';
import type { GateReport, Profile, RunManifest } from './model.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let profile: Profile = 'pr';
  let manifestFile: string | undefined;
  let start = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && args[i + 1]) root = path.resolve(args[++i]);
    else if (args[i] === '--profile' && ['pr', 'nightly', 'release'].includes(args[i + 1])) profile = args[++i] as Profile;
    else if (args[i] === '--manifest' && args[i + 1]) manifestFile = args[++i];
    else if (args[i] === '--start-run') start = true;
    else throw new Error('Usage: quality:gate [--root path] [--profile pr|nightly|release] [--manifest path] [--start-run]');
  }
  const reports = path.join(root, 'reports');
  await mkdir(reports, { recursive: true });
  const manifestPath = path.resolve(root, manifestFile ?? 'reports/run-manifest.json');
  const gitCommit = (): string | null => {
    try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
  };
  if (start) {
    const manifest: RunManifest = { schemaVersion: '1.0', runId: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}` : randomUUID(), commit: gitCommit(), startedAt: new Date().toISOString() };
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Started evidence run ${manifest.runId}; manifest ${manifestPath}`);
    return;
  }
  let report: GateReport;
  try {
    let manifest: RunManifest | null = null;
    try { manifest = validateManifest(JSON.parse(await readFile(manifestPath, 'utf8'))); } catch (error) {
      if (manifestFile || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (manifest?.commit && gitCommit() !== manifest.commit) throw new Error('Run manifest commit differs from the current checkout');
    report = await evaluateGate({ root, profile, config: await readConfig(root), manifest });
  } catch (error) {
    report = { schemaVersion: '1.0', generatedAt: new Date().toISOString(), profile, decision: 'BLOCK', exitCode: 1, recommendation: 'Gate configuration or run provenance is invalid. No release recommendation can be supported.', run: null, provenanceWarning: null, evidence: [], reasons: [(error as Error).message] };
  }
  await writeFile(path.join(reports, 'quality-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(reports, 'quality-gate.md'), markdown(report));
  console.log(`SentinelQE quality gate: ${report.decision} (${profile})`);
  for (const item of report.evidence) console.log(`  ${item.source.padEnd(13)} ${item.status.padEnd(7)} ${item.availability}${item.required ? ' [required]' : ''}`);
  for (const reason of report.reasons) console.log(`  - ${reason}`);
  console.log(`Reports: ${path.join(reports, 'quality-gate.json')} and quality-gate.md`);
  process.exitCode = report.exitCode;
}
main().catch(error => { console.error((error as Error).message); process.exitCode = 2; });
