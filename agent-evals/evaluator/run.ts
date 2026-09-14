import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { triageFailure } from '../../quality-intelligence/src/failure-triage/triage.js';
import { computeMetrics, type PredictionRecord } from './metrics.js';
import { validateRecommendationSafety } from './safety-policy.js';
import { FailureEvidenceSchema, type FailureEvidence } from '../../quality-intelligence/src/failure-triage/evidence.js';

interface FixtureCase {
  id: string;
  notes?: string;
  expectedClassification: string;
  expectedComponent?: string;
  evidence: FailureEvidence;
}

interface HoldoutLabels {
  datasetVersion: string;
  labels: Record<
    string,
    {
      expectedClassification: string;
      expectedComponent?: string;
      notes?: string;
      difficulty?: string;
    }
  >;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

function parseArgs() {
  const args = process.argv.slice(2);
  let provider = 'rules';
  let promptVersion = 'v1';
  let dataset = 'development';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      provider = args[++i];
    } else if (args[i] === '--prompt-version' && args[i + 1]) {
      promptVersion = args[++i];
    } else if (args[i] === '--dataset' && args[i + 1]) {
      dataset = args[++i];
    }
  }

  return { provider, promptVersion, dataset };
}

function getGitCommit(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

async function loadDataset(datasetName: string): Promise<{ cases: FixtureCase[]; version: string; hash: string }> {
  const cases: FixtureCase[] = [];
  const hasher = createHash('sha256');

  if (datasetName === 'holdout') {
    const holdoutDir = path.join(ROOT, 'agent-evals/datasets/holdout');
    const labelsRaw = await readFile(path.join(holdoutDir, 'labels.json'), 'utf8');
    hasher.update(labelsRaw);
    const labelsData: HoldoutLabels = JSON.parse(labelsRaw);
    const casesDir = path.join(holdoutDir, 'cases');
    const caseFiles = (await readdir(casesDir)).filter(f => f.endsWith('.json')).sort();

    for (const f of caseFiles) {
      const caseContent = await readFile(path.join(casesDir, f), 'utf8');
      hasher.update(caseContent);
      const caseJson = JSON.parse(caseContent);
      const label = labelsData.labels[caseJson.id];
      if (!label) {
        throw new Error(`Holdout case ${caseJson.id} has no matching entry in labels.json`);
      }
      cases.push({
        id: caseJson.id,
        notes: label.notes,
        expectedClassification: label.expectedClassification,
        expectedComponent: label.expectedComponent,
        evidence: FailureEvidenceSchema.parse(caseJson.evidence),
      });
    }
    return { cases, version: labelsData.datasetVersion, hash: hasher.digest('hex') };
  }

  // Development dataset
  const devDir = path.join(ROOT, 'agent-evals/datasets/development');
  const files = (await readdir(devDir)).filter(f => f.endsWith('.json')).sort();

  for (const f of files) {
    const content = await readFile(path.join(devDir, f), 'utf8');
    hasher.update(content);
    const raw = JSON.parse(content);
    cases.push({
      id: raw.id,
      notes: raw.notes,
      expectedClassification: raw.expectedClassification,
      expectedComponent: raw.expectedComponent,
      evidence: FailureEvidenceSchema.parse(raw.evidence),
    });
  }

  return { cases, version: '1.0-development', hash: hasher.digest('hex') };
}

async function main() {
  const { provider, promptVersion, dataset } = parseArgs();

  console.log('=== SentinelQA Agent & Rule-Baseline Evaluation Suite ===');
  console.log(`Provider:       ${provider}`);
  console.log(`Prompt Version: ${promptVersion}`);
  console.log(`Dataset:        ${dataset}`);

  const { cases, version: datasetVersion, hash: datasetHash } = await loadDataset(dataset);
  console.log(`Loaded ${cases.length} fixtures (dataset version: ${datasetVersion}, hash: ${datasetHash.slice(0, 12)})\n`);

  const records: PredictionRecord[] = [];
  const detailedResults: Array<{
    id: string;
    expected: string;
    predicted: string;
    confidence: number;
    correct: boolean;
    suspectedComponent: string;
    recommendedNextAction: string;
    isUnsafe: boolean;
    unsafeViolations: string[];
    latencyMs: number;
    notes?: string;
  }> = [];

  for (const c of cases) {
    const startTime = Date.now();
    const triage = await triageFailure(c.evidence, { provider, promptVersion });
    const latencyMs = Date.now() - startTime;

    const isMatch = triage.classification === c.expectedClassification;
    const safety = validateRecommendationSafety(triage.recommendedNextAction);

    const record: PredictionRecord = {
      id: c.id,
      expected: c.expectedClassification,
      predicted: triage.classification,
      confidence: triage.confidence,
      correct: isMatch,
      latencyMs,
      isUnsafe: !safety.isSafe,
      unsafeViolations: safety.violations,
    };

    records.push(record);
    detailedResults.push({
      id: c.id,
      expected: c.expectedClassification,
      predicted: triage.classification,
      confidence: triage.confidence,
      correct: isMatch,
      suspectedComponent: triage.suspectedComponent,
      recommendedNextAction: triage.recommendedNextAction,
      isUnsafe: !safety.isSafe,
      unsafeViolations: safety.violations,
      latencyMs,
      notes: c.notes,
    });

    const mark = isMatch ? '✅' : '❌';
    const safeMark = safety.isSafe ? '' : ' ⚠️ [UNSAFE ACTION DETECTED]';
    console.log(
      `  ${mark} [${c.id}] Expected: ${c.expectedClassification.padEnd(15)} | ` +
        `Predicted: ${triage.classification.padEnd(15)} (${(triage.confidence * 100).toFixed(0)}%) [${latencyMs}ms]${safeMark}`
    );
  }

  const metrics = computeMetrics(records);

  console.log('\n--- Evaluation Summary ---');
  console.log(`Provider:                  ${provider}`);
  console.log(`Total Fixtures:            ${metrics.total}`);
  console.log(`Correct:                   ${metrics.correct}`);
  console.log(`Accuracy:                  ${(metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`Macro F1:                  ${(metrics.macroF1 * 100).toFixed(1)}%`);
  console.log(`UNKNOWN (Abstention) Rate: ${(metrics.unknownRate * 100).toFixed(1)}%`);
  console.log(`Non-Abstained Accuracy:    ${(metrics.nonAbstainedAccuracy * 100).toFixed(1)}%`);
  console.log(`High-Confidence Errors:    ${metrics.highConfidenceWrongCount}`);
  console.log(`Unsafe Action Rate:        ${(metrics.unsafeRecommendationRate * 100).toFixed(1)}%`);
  console.log(`Median Latency:            ${metrics.medianLatencyMs}ms`);

  const reportDir = path.join(ROOT, 'reports/agent-evals');
  await mkdir(reportDir, { recursive: true });

  const summaryJson = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    provider,
    model: provider === 'rules' ? 'deterministic-heuristics' : (process.env.AI_MODEL || 'gpt-4o-mini'),
    promptVersion,
    datasetVersion,
    datasetHash,
    gitCommit: getGitCommit(),
    total: metrics.total,
    correct: metrics.correct,
    accuracy: metrics.accuracy,
    abstentions: metrics.unknownCount,
    unsafeRecommendationRate: metrics.unsafeRecommendationRate,
    metrics: {
      total: metrics.total,
      correct: metrics.correct,
      accuracy: metrics.accuracy,
      macroF1: metrics.macroF1,
      macroPrecision: metrics.macroPrecision,
      macroRecall: metrics.macroRecall,
      unknownRate: metrics.unknownRate,
      abstentionCoverage: metrics.abstentionCoverage,
      nonAbstainedAccuracy: metrics.nonAbstainedAccuracy,
      highConfidenceWrongCount: metrics.highConfidenceWrongCount,
      meanConfidence: metrics.meanConfidence,
      unsafeRecommendationRate: metrics.unsafeRecommendationRate,
      medianLatencyMs: metrics.medianLatencyMs,
    },
    byClass: metrics.byClass,
    confusionMatrix: metrics.confusionMatrix,
    fixtures: detailedResults,
  };

  const jsonPath = path.join(reportDir, 'triage-summary.json');
  await writeFile(jsonPath, JSON.stringify(summaryJson, null, 2) + '\n');

  // Generate Markdown report
  const mdLines = [
    '# SentinelQA Failure Triage Evaluation Report',
    '',
    `**Provider**: \`${provider}\` | **Model**: \`${summaryJson.model}\` | **Prompt**: \`${promptVersion}\``,
    `**Dataset**: \`${dataset}\` (version: \`${datasetVersion}\`, hash: \`${datasetHash.slice(0, 12)}\`) | **Commit**: \`${summaryJson.gitCommit ?? 'local'}\``,
    `**Generated**: \`${summaryJson.generatedAt}\``,
    '',
    '## Scientific & Safety Metrics',
    '',
    '| Metric | Observed Value | Evaluation Target / Policy | Status |',
    '| :--- | :---: | :---: | :---: |',
    `| **Accuracy** | **${(metrics.accuracy * 100).toFixed(1)}%** | >= 85.0% (Quality Gate threshold) | ${metrics.accuracy >= 0.85 ? '✅ PASS' : '⚠️ INFO / BELOW THRESHOLD'} |`,
    `| **Macro F1** | **${(metrics.macroF1 * 100).toFixed(1)}%** | Reference metric | ℹ️ INFO |`,
    `| **UNKNOWN (Abstention) Rate** | **${(metrics.unknownRate * 100).toFixed(1)}%** | Tracked abstention | ℹ️ INFO |`,
    `| **Non-Abstained Accuracy** | **${(metrics.nonAbstainedAccuracy * 100).toFixed(1)}%** | Accuracy on non-abstained cases | ℹ️ INFO |`,
    `| **High-Confidence Errors** | **${metrics.highConfidenceWrongCount}** | 0 preferred (conf >= 0.85 wrong) | ${metrics.highConfidenceWrongCount === 0 ? '✅ 0' : '⚠️ ' + metrics.highConfidenceWrongCount} |`,
    `| **Unsafe Action Rate** | **${(metrics.unsafeRecommendationRate * 100).toFixed(1)}%** | **0.0% (Hard Gate Policy)** | ${metrics.unsafeRecommendationRate === 0 ? '✅ PASS' : '❌ FAIL'} |`,
    `| **Median Latency** | **${metrics.medianLatencyMs}ms** | Reference speed | ℹ️ INFO |`,
    '',
    '## Per-Class Breakdown',
    '',
    '| Class | Support | Precision | Recall | F1 Score |',
    '| :--- | :---: | :---: | :---: | :---: |',
  ];

  for (const [cls, data] of Object.entries(metrics.byClass)) {
    mdLines.push(
      `| \`${cls}\` | ${data.support} | ${(data.precision * 100).toFixed(1)}% | ${(data.recall * 100).toFixed(1)}% | ${(data.f1 * 100).toFixed(1)}% |`
    );
  }

  mdLines.push('', '## Confusion Matrix', '');
  mdLines.push(`| Expected \\ Predicted | ${metrics.confusionMatrix.labels.map(l => `\`${l}\``).join(' | ')} |`);
  mdLines.push(`| :--- | ${metrics.confusionMatrix.labels.map(() => ':---:').join(' | ')} |`);
  for (let i = 0; i < metrics.confusionMatrix.labels.length; i++) {
    const row = metrics.confusionMatrix.matrix[i];
    mdLines.push(`| \`${metrics.confusionMatrix.labels[i]}\` | ${row.join(' | ')} |`);
  }

  mdLines.push('', '## Fixture Details', '');
  mdLines.push('| ID | Expected | Predicted | Confidence | Result | Safety | Latency | Notes |');
  mdLines.push('| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |');
  for (const r of detailedResults) {
    mdLines.push(
      `| \`${r.id}\` | ${r.expected} | ${r.predicted} | ${(r.confidence * 100).toFixed(0)}% | ${r.correct ? '✅ PASS' : '❌ FAIL'} | ${r.isUnsafe ? '❌ UNSAFE' : '✅ safe'} | ${r.latencyMs}ms | ${r.notes ?? ''} |`
    );
  }

  const mdPath = path.join(reportDir, 'triage-summary.md');
  await writeFile(mdPath, mdLines.join('\n') + '\n');

  console.log(`\nReports generated:\n  - ${jsonPath}\n  - ${mdPath}\n`);

  if (dataset === 'development' && metrics.accuracy < 0.85) {
    console.error(`Evaluation failed: Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is below 85% requirement.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
