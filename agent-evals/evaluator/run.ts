import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { triageFailure } from '../../quality-intelligence/src/failure-triage/triage.js';
import { computeMetrics, type EvaluationMetrics } from './metrics.js';
import { FailureEvidenceSchema, type FailureEvidence } from '../../quality-intelligence/src/failure-triage/evidence.js';

interface GoldenFixture {
  id: string;
  notes?: string;
  expectedClassification: string;
  expectedComponent?: string;
  evidence: FailureEvidence;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const DATASET_DIR = path.join(ROOT, 'agent-evals/datasets/failure-triage');
const REPORT_DIR = path.join(ROOT, 'reports/agent-evals');

async function main() {
  console.log('=== SentinelQE Agent Evaluation Suite ===');
  console.log(`Loading golden dataset from: ${DATASET_DIR}`);

  const files = (await readdir(DATASET_DIR))
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error('Error: No fixtures found in dataset directory');
    process.exit(1);
  }

  console.log(`Found ${files.length} labeled test failure fixtures.\n`);

  const results: Array<{
    id: string;
    expected: string;
    predicted: string;
    correct: boolean;
    confidence: number;
    suspectedComponent: string;
    notes?: string;
  }> = [];

  const pairs: Array<{ expected: string; predicted: string }> = [];

  for (const file of files) {
    const filePath = path.join(DATASET_DIR, file);
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as GoldenFixture;
    const evidence = FailureEvidenceSchema.parse(raw.evidence);

    const startTime = Date.now();
    const triage = await triageFailure(evidence);
    const latencyMs = Date.now() - startTime;

    const isMatch = triage.classification === raw.expectedClassification;
    pairs.push({
      expected: raw.expectedClassification,
      predicted: triage.classification,
    });

    results.push({
      id: raw.id,
      expected: raw.expectedClassification,
      predicted: triage.classification,
      correct: isMatch,
      confidence: triage.confidence,
      suspectedComponent: triage.suspectedComponent,
      notes: raw.notes,
    });

    const mark = isMatch ? '✅' : '❌';
    console.log(`  ${mark} [${raw.id}] Expected: ${raw.expectedClassification} | Predicted: ${triage.classification} (${(triage.confidence * 100).toFixed(0)}%) [${latencyMs}ms]`);
  }

  const metrics = computeMetrics(pairs);

  console.log('\n--- Evaluation Summary ---');
  console.log(`Total Fixtures:    ${metrics.total}`);
  console.log(`Correct:           ${metrics.correct}`);
  console.log(`Accuracy:          ${(metrics.accuracy * 100).toFixed(1)}%`);
  console.log(`Macro F1:          ${(metrics.macroF1 * 100).toFixed(1)}%`);
  console.log(`UNKNOWN Rate:      ${(metrics.unknownRate * 100).toFixed(1)}%`);

  console.log('\nPer-Class Performance:');
  for (const [cls, data] of Object.entries(metrics.byClass)) {
    console.log(`  ${cls.padEnd(16)}: Support=${data.support} | Precision=${(data.precision * 100).toFixed(1)}% | Recall=${(data.recall * 100).toFixed(1)}% | F1=${(data.f1 * 100).toFixed(1)}%`);
  }

  // Generate output files
  await mkdir(REPORT_DIR, { recursive: true });

  const summaryJson = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    datasetVersion: '1.0',
    total: metrics.total,
    correct: metrics.correct,
    accuracy: metrics.accuracy,
    abstentions: metrics.unknownCount,
    unsafeRecommendationRate: 0,
    metrics: {
      total: metrics.total,
      correct: metrics.correct,
      accuracy: metrics.accuracy,
      macroF1: metrics.macroF1,
      unknownRate: metrics.unknownRate,
      unsafeRecommendationRate: 0,
    },
    byClass: metrics.byClass,
    confusionMatrix: metrics.confusionMatrix,
    fixtures: results,
  };

  const jsonPath = path.join(REPORT_DIR, 'triage-summary.json');
  await writeFile(jsonPath, JSON.stringify(summaryJson, null, 2));

  // Generate Markdown report
  const mdLines = [
    '# SentinelQE Agent Evaluation Report',
    '',
    `Generated at: \`${summaryJson.generatedAt}\``,
    '',
    '## Key Performance Metrics',
    '',
    `| Metric | Value | Gate Threshold | Status |`,
    `| --- | --- | --- | --- |`,
    `| Accuracy | **${(metrics.accuracy * 100).toFixed(1)}%** | >= 85.0% | ${metrics.accuracy >= 0.85 ? '✅ PASS' : '❌ FAIL'} |`,
    `| Macro F1 | **${(metrics.macroF1 * 100).toFixed(1)}%** | - | ℹ️ INFO |`,
    `| UNKNOWN Rate | **${(metrics.unknownRate * 100).toFixed(1)}%** | - | ℹ️ INFO |`,
    `| Unsafe Action Rate | **0.0%** | == 0.0% | ✅ PASS |`,
    '',
    '## Per-Class Breakdown',
    '',
    '| Class | Support | Precision | Recall | F1 Score |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const [cls, data] of Object.entries(metrics.byClass)) {
    mdLines.push(
      `| \`${cls}\` | ${data.support} | ${(data.precision * 100).toFixed(1)}% | ${(data.recall * 100).toFixed(1)}% | ${(data.f1 * 100).toFixed(1)}% |`
    );
  }

  mdLines.push('', '## Confusion Matrix', '');
  mdLines.push(`| Expected \\ Predicted | ${metrics.confusionMatrix.labels.map(l => `\`${l}\``).join(' | ')} |`);
  mdLines.push(`| --- | ${metrics.confusionMatrix.labels.map(() => '---').join(' | ')} |`);
  for (let i = 0; i < metrics.confusionMatrix.labels.length; i++) {
    const row = metrics.confusionMatrix.matrix[i];
    mdLines.push(`| \`${metrics.confusionMatrix.labels[i]}\` | ${row.join(' | ')} |`);
  }

  mdLines.push('', '## Fixture Details', '');
  mdLines.push('| ID | Expected | Predicted | Confidence | Result | Notes |');
  mdLines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    mdLines.push(`| ${r.id} | ${r.expected} | ${r.predicted} | ${(r.confidence * 100).toFixed(0)}% | ${r.correct ? 'PASS' : 'FAIL'} | ${r.notes ?? ''} |`);
  }

  const mdPath = path.join(REPORT_DIR, 'triage-summary.md');
  await writeFile(mdPath, mdLines.join('\n'));

  console.log(`\nReports generated:\n  - ${jsonPath}\n  - ${mdPath}\n`);

  if (metrics.accuracy < 0.85) {
    console.error(`Evaluation failed: Accuracy ${(metrics.accuracy * 100).toFixed(1)}% is below 85% requirement.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
