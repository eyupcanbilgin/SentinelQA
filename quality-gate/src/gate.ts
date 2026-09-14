import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { criticalTests, finite, normalizeEvals, normalizeJunit, normalizeK6, normalizePit, normalizePlaywright, object } from './normalize.js';
import { sources, type Evidence, type GateConfig, type GateReport, type Normalized, type Profile, type Provenance, type RunManifest, type Source } from './model.js';

export function validateConfig(raw: unknown): GateConfig {
  const config = object(raw, 'Quality gate config');
  if (config.schemaVersion !== '1.0') throw new Error('Unsupported quality gate schemaVersion');
  finite(config.maxAgeHours, 'maxAgeHours', 0.01, 168);
  const profiles = object(config.profiles, 'profiles');
  for (const profile of ['pr', 'nightly', 'release']) {
    const required = object(profiles[profile], `profiles.${profile}`).required;
    if (!Array.isArray(required) || !required.length || new Set(required).size !== required.length || required.some(value => !sources.includes(value))) throw new Error(`Invalid required evidence in ${profile}`);
  }
  for (const key of ['criticalSecurityIds', 'criticalE2eIds']) {
    const ids = config[key];
    if (!Array.isArray(ids) || !ids.length || ids.some(value => typeof value !== 'string' || !/^(SEC|E2E)-[A-Z]+-\d{3}$/.test(value)) || new Set(ids).size !== ids.length) throw new Error(`Invalid ${key}`);
  }
  finite(object(config.performance, 'performance').maxErrorRate, 'performance.maxErrorRate', 0, 1);
  finite(config.performance.maxP95Ms, 'performance.maxP95Ms', 1);
  finite(object(config.mutation, 'mutation').minimumScore, 'mutation.minimumScore', 0, 1);
  finite(object(config.ai, 'ai').minimumAccuracy, 'ai.minimumAccuracy', 0, 1);
  finite(config.ai.maxUnsafeRecommendationRate, 'ai.maxUnsafeRecommendationRate', 0, 1);
  return config as GateConfig;
}
export async function readConfig(root: string): Promise<GateConfig> {
  return validateConfig(parse(await readFile(path.join(root, 'quality/quality-gate.yml'), 'utf8')));
}
export function validateManifest(value: unknown): RunManifest {
  const manifest = object(value, 'Run manifest');
  if (manifest.schemaVersion !== '1.0' || typeof manifest.runId !== 'string' || !manifest.runId.trim() || typeof manifest.startedAt !== 'string' || !Number.isFinite(Date.parse(manifest.startedAt)) || (manifest.commit !== null && (typeof manifest.commit !== 'string' || !/^[a-f\d]{40,64}$/i.test(manifest.commit)))) throw new Error('Invalid run manifest');
  return manifest as RunManifest;
}
async function discover(root: string, directory: string): Promise<string[]> {
  try {
    return (await readdir(path.join(root, directory), { withFileTypes: true })).filter(entry => entry.isFile() && /^TEST-.+\.xml$/.test(entry.name)).map(entry => `${directory}/${entry.name}`).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
interface Artifact { text: string; provenance: Provenance }
async function artifact(root: string, file: string, now: Date): Promise<Artifact | null> {
  let info;
  try { info = await stat(path.join(root, file)); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  if (!info.isFile() || info.size === 0 || info.size > 20 * 1024 * 1024) throw new Error(`${file}: artifact must be a nonempty file <=20 MiB`);
  const content = await readFile(path.join(root, file));
  return { text: content.toString('utf8'), provenance: { path: file, bytes: info.size, modifiedAt: info.mtime.toISOString(), ageHours: (now.getTime() - info.mtimeMs) / 3_600_000, sha256: createHash('sha256').update(content).digest('hex') } };
}
function reportedTime(text: string, source: Source): string | undefined {
  if (source === 'agentEvals') return JSON.parse(text).generatedAt;
  if (source === 'e2e') return JSON.parse(text).stats?.startTime;
  // Maven timestamps omit a zone; the file's UTC mtime is authoritative for these reports.
  if (source === 'unit' || source === 'integration') return text.match(/\btimestamp="([^"]+)"/)?.[1];
  return undefined;
}
export async function evaluateGate(options: { root: string; profile: Profile; config: GateConfig; now?: Date; manifest?: RunManifest | null }): Promise<GateReport> {
  const { root, profile, config } = options;
  validateConfig(config);
  const now = options.now ?? new Date();
  const run = options.manifest ? validateManifest(options.manifest) : null;
  if (run && Date.parse(run.startedAt) > now.getTime() + 300_000) throw new Error('Run manifest timestamp is in the future');
  const required = new Set(config.profiles[profile].required);
  const load = async (source: Source, files: string[], normalize: (texts: string[]) => Normalized): Promise<Evidence> => {
    const artifacts: Provenance[] = [];
    try {
      const loaded = await Promise.all(files.map(file => artifact(root, file, now)));
      const present = loaded.filter((item): item is Artifact => item !== null);
      artifacts.push(...present.map(item => item.provenance));
      if (!present.length || present.length !== files.length) return { source, required: required.has(source), status: 'NOT_RUN', availability: 'MISSING', artifacts, metrics: {}, reasons: ['Report artifact is missing; this source was NOT_RUN'] };
      const normalized = normalize(present.map(item => item.text));
      const stale: string[] = [];
      for (const item of present) {
        const recorded = reportedTime(item.text, source);
        if (recorded !== undefined) {
          if (typeof recorded !== 'string' || !Number.isFinite(Date.parse(recorded))) throw new Error('Invalid embedded report timestamp');
          item.provenance.reportedAt = recorded;
          if (/Z$|[+-]\d\d:\d\d$/.test(recorded)) {
            const age = (now.getTime() - Date.parse(recorded)) / 3_600_000;
            item.provenance.ageHours = Math.max(item.provenance.ageHours, age);
            if (age < -5 / 60) throw new Error('Report timestamp is in the future');
            if (run && Date.parse(recorded) < Date.parse(run.startedAt) - 2000) stale.push(`${item.provenance.path} embedded timestamp predates the current run`);
          }
        }
        if (item.provenance.ageHours < -5 / 60) throw new Error('Artifact modification time is in the future');
        if (item.provenance.ageHours > config.maxAgeHours) stale.push(`${item.provenance.path} exceeds max age ${config.maxAgeHours} hours`);
        if (run && Date.parse(item.provenance.modifiedAt) < Date.parse(run.startedAt) - 2000) stale.push(`${item.provenance.path} predates the current run`);
      }
      if (stale.length) return { source, required: required.has(source), status: normalized.status === 'FAIL' ? 'FAIL' : 'NOT_RUN', availability: 'STALE', artifacts, metrics: normalized.metrics, reasons: [...normalized.reasons, ...stale] };
      return { source, required: required.has(source), availability: 'VALID', artifacts, ...normalized };
    } catch (error) {
      return { source, required: required.has(source), status: 'NOT_RUN', availability: 'INVALID', artifacts, metrics: {}, reasons: [`Invalid evidence: ${(error as Error).message}`] };
    }
  };
  const [unit, integration, e2e, performance, mutation, agentEvals] = await Promise.all([
    load('unit', await discover(root, 'backend/target/surefire-reports'), normalizeJunit),
    load('integration', await discover(root, 'backend/target/failsafe-reports'), normalizeJunit),
    load('e2e', ['reports/playwright/results.json'], texts => normalizePlaywright(JSON.parse(texts[0]), config.criticalE2eIds)),
    load('performance', ['reports/k6/summary.json'], texts => normalizeK6(JSON.parse(texts[0]), config.performance)),
    load('mutation', ['backend/target/pit-reports/mutations.xml'], texts => normalizePit(texts[0], config.mutation.minimumScore)),
    load('agentEvals', ['reports/agent-evals/triage-summary.json'], texts => normalizeEvals(JSON.parse(texts[0]), config.ai)),
  ]);
  const security: Evidence = integration.availability === 'VALID'
    ? { source: 'security', required: required.has('security'), availability: 'VALID', artifacts: integration.artifacts, ...criticalTests(integration, config.criticalSecurityIds) }
    : { source: 'security', required: required.has('security'), availability: integration.availability, artifacts: integration.artifacts, status: 'NOT_RUN', metrics: {}, reasons: ['Critical authorization IDs cannot be verified from valid integration XML', ...integration.reasons] };
  const evidence = [unit, integration, security, e2e, performance, mutation, agentEvals];
  const failures = evidence.filter(item => item.status === 'FAIL' || item.availability === 'INVALID');
  const missing = evidence.filter(item => item.required && item.status === 'NOT_RUN');
  const warnings = evidence.filter(item => !item.required && item.status === 'NOT_RUN' || item.status === 'PASS' && item.reasons.length);
  const provenanceWarning = run ? null : 'No run manifest supplied; timestamps and hashes are recorded, but reports are not bound to a single execution. Use --start-run before running suites.';
  const decision = failures.length ? 'BLOCK' : missing.length ? 'INSUFFICIENT_EVIDENCE' : warnings.length || provenanceWarning ? 'WARN' : 'PASS';
  return {
    schemaVersion: '1.0', generatedAt: now.toISOString(), profile, decision, exitCode: decision === 'BLOCK' || decision === 'INSUFFICIENT_EVIDENCE' ? 1 : 0,
    recommendation: decision === 'PASS' ? 'Available quality evidence satisfies configured release criteria. Engineering judgment remains required.' : decision === 'WARN' ? 'Required evidence satisfies configured criteria, with warnings. Review optional coverage and provenance before a release decision.' : decision === 'BLOCK' ? 'Available evidence violates quality criteria or is invalid. Resolve the recorded failures before a release decision.' : 'Mandatory quality evidence is missing, stale, or unexecuted. No release recommendation can be supported.',
    run, provenanceWarning, evidence,
    reasons: [...evidence.flatMap(item => item.reasons.map(reason => `${item.source}: ${reason}`)), ...(provenanceWarning ? [provenanceWarning] : [])],
  };
}
function escapeCell(value: string): string { return value.replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
export function markdown(report: GateReport): string {
  const lines = ['# SentinelQE Quality Gate', '', `**${report.decision}** · profile \`${report.profile}\` · ${report.generatedAt}`, '', report.recommendation, '', '| Evidence | Required | Status | Availability | Metrics |', '| --- | --- | --- | --- | --- |'];
  for (const item of report.evidence) lines.push(`| ${item.source} | ${item.required ? 'yes' : 'no'} | ${item.status} | ${item.availability} | ${escapeCell(Object.entries(item.metrics).map(([key, value]) => `${key}=${value}`).join(', '))} |`);
  lines.push('', '## Reasons', '', ...report.reasons.map(reason => `- ${escapeCell(reason)}`));
  if (!report.reasons.length) lines.push('All configured sources satisfy their criteria.');
  lines.push('', '## Provenance', '', `Run: ${report.run ? escapeCell(`${report.run.runId}; commit ${report.run.commit ?? 'unavailable'}; started ${report.run.startedAt}`) : 'unbound'}`, '');
  const artifacts = [...new Map(report.evidence.flatMap(item => item.artifacts).map(item => [item.path, item])).values()];
  for (const artifact of artifacts) lines.push(`- \`${escapeCell(artifact.path)}\`: SHA-256 \`${artifact.sha256}\`; modified ${artifact.modifiedAt}; age ${artifact.ageHours.toFixed(2)}h${artifact.reportedAt ? `; report timestamp ${escapeCell(artifact.reportedAt)}` : ''}`);
  return `${lines.join('\n')}\n`;
}
