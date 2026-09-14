import { readFile } from 'node:fs/promises';

export interface TestExecutionRecord {
  testId: string;
  runId: string;
  timestamp: string;
  status: 'PASSED' | 'FAILED' | 'RETRY_PASSED';
  durationMs: number;
}

export function analyzeFlakiness(records: TestExecutionRecord[]) {
  const byTest = new Map<string, TestExecutionRecord[]>();
  for (const r of records) {
    const list = byTest.get(r.testId) ?? [];
    list.push(r);
    byTest.set(r.testId, list);
  }

  const results = [];
  for (const [testId, runs] of byTest.entries()) {
    const retryPasses = runs.filter(r => r.status === 'RETRY_PASSED').length;
    const failures = runs.filter(r => r.status === 'FAILED').length;
    const passes = runs.filter(r => r.status === 'PASSED').length;
    const total = runs.length;
    const isFlaky = retryPasses > 0 || (failures > 0 && passes > 0);

    results.push({
      testId,
      totalRuns: total,
      passes,
      failures,
      retryPasses,
      flakinessScore: total > 0 ? (retryPasses * 2 + (failures > 0 && passes > 0 ? 1 : 0)) / total : 0,
      isFlaky,
    });
  }

  return results.sort((a, b) => b.flakinessScore - a.flakinessScore);
}

async function main() {
  console.log('=== SentinelQE Flaky Test Intelligence ===');
  const sampleRecords: TestExecutionRecord[] = [
    { testId: 'API-PAY-001', runId: 'run-1', timestamp: new Date().toISOString(), status: 'PASSED', durationMs: 120 },
    { testId: 'API-PAY-001', runId: 'run-2', timestamp: new Date().toISOString(), status: 'PASSED', durationMs: 115 },
    { testId: 'E2E-LEAVE-001', runId: 'run-1', timestamp: new Date().toISOString(), status: 'FAILED', durationMs: 4500 },
    { testId: 'E2E-LEAVE-001', runId: 'run-1-retry', timestamp: new Date().toISOString(), status: 'RETRY_PASSED', durationMs: 4200 },
    { testId: 'E2E-LEAVE-001', runId: 'run-2', timestamp: new Date().toISOString(), status: 'PASSED', durationMs: 4100 },
    { testId: 'SEC-AUTHZ-001', runId: 'run-1', timestamp: new Date().toISOString(), status: 'PASSED', durationMs: 80 },
  ];

  const analysis = analyzeFlakiness(sampleRecords);
  console.log('\nFlakiness Analysis Summary:');
  for (const item of analysis) {
    const status = item.isFlaky ? '⚠️ FLAKY' : '✅ STABLE';
    console.log(`- [${status}] ${item.testId} (Flakiness index: ${(item.flakinessScore * 100).toFixed(1)}%, Retries: ${item.retryPasses}/${item.totalRuns})`);
  }
}

main();
