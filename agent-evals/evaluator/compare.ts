import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

interface RunOutput {
  provider: string;
  model: string;
  accuracy: number | string;
  macroF1: number | string;
  abstentionRate: number | string;
  highConfErrors: number | string;
  unsafeRate: number | string;
  latencyMs: number | string;
  status: string;
}

async function runComparison() {
  console.log('=== SentinelQA Quality Intelligence: Rule Baseline vs LLM Benchmark ===\n');

  const rows: RunOutput[] = [];

  // 1. Run Rule Baseline on Holdout Benchmark
  try {
    execFileSync(
      'npx',
      ['tsx', 'agent-evals/evaluator/run.ts', '--dataset', 'holdout', '--provider', 'rules'],
      { cwd: ROOT, encoding: 'utf8', shell: true }
    );
    const summary = JSON.parse(
      await readFile(path.join(ROOT, 'reports/agent-evals/triage-summary.json'), 'utf8')
    );
    rows.push({
      provider: 'Rule Baseline (Holdout)',
      model: 'deterministic-rules',
      accuracy: `${(summary.metrics.accuracy * 100).toFixed(1)}%`,
      macroF1: `${(summary.metrics.macroF1 * 100).toFixed(1)}%`,
      abstentionRate: `${(summary.metrics.unknownRate * 100).toFixed(1)}%`,
      highConfErrors: `${summary.metrics.highConfidenceWrongCount}`,
      unsafeRate: `${(summary.metrics.unsafeRecommendationRate * 100).toFixed(1)}%`,
      latencyMs: `${summary.metrics.medianLatencyMs}ms`,
      status: 'VERIFIED',
    });
  } catch (err) {
    console.error('Failed to run rule baseline:', err);
  }

  // 2. Check if real LLM provider is configured
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      console.log('Running real LLM benchmark (v1)...');
      execFileSync(
        'npx',
        ['tsx', 'agent-evals/evaluator/run.ts', '--dataset', 'holdout', '--provider', 'openai', '--prompt-version', 'v1'],
        { cwd: ROOT, encoding: 'utf8', shell: true }
      );
      const summary = JSON.parse(
        await readFile(path.join(ROOT, 'reports/agent-evals/triage-summary.json'), 'utf8')
      );
      rows.push({
        provider: 'LLM Triage (v1 Prompt)',
        model: summary.model,
        accuracy: `${(summary.metrics.accuracy * 100).toFixed(1)}%`,
        macroF1: `${(summary.metrics.macroF1 * 100).toFixed(1)}%`,
        abstentionRate: `${(summary.metrics.unknownRate * 100).toFixed(1)}%`,
        highConfErrors: `${summary.metrics.highConfidenceWrongCount}`,
        unsafeRate: `${(summary.metrics.unsafeRecommendationRate * 100).toFixed(1)}%`,
        latencyMs: `${summary.metrics.medianLatencyMs}ms`,
        status: 'VERIFIED',
      });
    } catch (err) {
      console.warn('Real LLM run failed:', (err as Error).message);
    }
  } else {
    rows.push({
      provider: 'LLM Triage (v1 Prompt)',
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      accuracy: 'NOT_CONFIGURED',
      macroF1: 'NOT_CONFIGURED',
      abstentionRate: 'NOT_CONFIGURED',
      highConfErrors: 'NOT_CONFIGURED',
      unsafeRate: 'NOT_CONFIGURED',
      latencyMs: 'NOT_CONFIGURED',
      status: 'OPTIONAL_KEY_ABSENT',
    });
  }

  // Generate Comparison Markdown
  let md = `# Rule Baseline vs LLM Triage Benchmark\n\n`;
  md += `Engineering question: *Does an LLM provide enough improvement over deterministic rules to justify its latency, cost, and uncertainty?*\n\n`;
  md += `| System / Provider | Model | Accuracy | Macro F1 | Abstention Rate | High-Conf Errors | Unsafe Actions | Median Latency | Status |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of rows) {
    md += `| **${r.provider}** | \`${r.model}\` | ${r.accuracy} | ${r.macroF1} | ${r.abstentionRate} | ${r.highConfErrors} | ${r.unsafeRate} | ${r.latencyMs} | \`${r.status}\` |\n`;
  }

  md += `\n> **Methodology & Integrity Rule**:\n`;
  md += `> Real AI credentials are never required for local or PR Quality Gates. When \`OPENAI_API_KEY\` is not present, `;
  md += `the LLM benchmark is honestly labeled \`NOT_CONFIGURED\` rather than fabricated or quietly substituted with mocks.\n`;

  const reportPath = path.join(ROOT, 'reports/agent-evals/benchmark-comparison.md');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, md);

  console.log(md);
  console.log(`Comparison written to ${reportPath}\n`);
}

runComparison().catch(err => {
  console.error(err);
  process.exit(1);
});
