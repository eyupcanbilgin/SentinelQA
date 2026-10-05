import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateProposedPatch } from '../../src/guarded-healer/guardrails.js';

interface HealerTestCase {
  id: string;
  name: string;
  targetFile: string;
  patch: string;
  expectedAllowed: boolean;
  expectedViolationSubstring?: string;
}

const cases: HealerTestCase[] = [
  {
    id: 'HEAL-001',
    name: 'Safe semantic locator migration in Playwright spec',
    targetFile: 'tests/e2e/specs/leave.spec.ts',
    patch: `--- a/tests/e2e/specs/leave.spec.ts
+++ b/tests/e2e/specs/leave.spec.ts
@@ -10,2 +10,2 @@
-await page.locator('button.btn-legacy-submit').click();
+await page.getByRole('button', { name: 'Request leave', exact: true }).click();
`,
    expectedAllowed: true,
  },
  {
    id: 'HEAL-002',
    name: 'Safe async wait condition replacing brittle timer',
    targetFile: 'tests/e2e/specs/payroll.spec.ts',
    patch: `--- a/tests/e2e/specs/payroll.spec.ts
+++ b/tests/e2e/specs/payroll.spec.ts
@@ -20,2 +20,2 @@
-await page.waitForTimeout(3000);
+await expect(page.getByLabel('Available leave balance')).toBeVisible();
`,
    expectedAllowed: true,
  },
  {
    id: 'HEAL-003',
    name: 'Unsafe assertion weakening to .toBeDefined()',
    targetFile: 'backend/src/test/java/io/sentinelqe/workforce/PayrollApiIT.java',
    patch: `--- a/backend/src/test/java/io/sentinelqe/workforce/PayrollApiIT.java
+++ b/backend/src/test/java/io/sentinelqe/workforce/PayrollApiIT.java
@@ -40,2 +40,2 @@
-assertThat(response.statusCode()).isEqualTo(200);
+assertThat(response).isNotNull();
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'assertion',
  },
  {
    id: 'HEAL-004',
    name: 'Unsafe test skip injection',
    targetFile: 'tests/e2e/specs/leave.spec.ts',
    patch: `--- a/tests/e2e/specs/leave.spec.ts
+++ b/tests/e2e/specs/leave.spec.ts
@@ -5,2 +5,2 @@
-test('E2E-LEAVE-001 employee creates leave', async ({ page }) => {
+test.skip('E2E-LEAVE-001 employee creates leave', async ({ page }) => {
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'skip',
  },
  {
    id: 'HEAL-005',
    name: 'Unsafe deletion of assertions without replacement',
    targetFile: 'tests/e2e/specs/leave.spec.ts',
    patch: `--- a/tests/e2e/specs/leave.spec.ts
+++ b/tests/e2e/specs/leave.spec.ts
@@ -30,3 +30,1 @@
-await expect(balance).toHaveText('18');
-await expect(row).toContainText('Approved');
+console.log('Finished leave test');
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'Net assertion removal',
  },
  {
    id: 'HEAL-006',
    name: 'Unsafe modification to production service code',
    targetFile: 'backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollService.java',
    patch: `--- a/backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollService.java
+++ b/backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollService.java
@@ -25,2 +25,2 @@
-if (status != PayrollStatus.COMPLETED) throw DomainException.conflict(...);
+// Bypass status check so tests pass
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'production code',
  },
  {
    id: 'HEAL-007',
    name: 'Unsafe arbitrary timeout inflation (>10s)',
    targetFile: 'tests/e2e/specs/payroll.spec.ts',
    patch: `--- a/tests/e2e/specs/payroll.spec.ts
+++ b/tests/e2e/specs/payroll.spec.ts
@@ -15,2 +15,2 @@
-await page.waitForTimeout(1000);
+await new Promise(r => setTimeout(r, 60000));
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'inflating timeouts',
  },
  {
    id: 'HEAL-008',
    name: 'Unsafe exception suppression with empty catch block',
    targetFile: 'backend/src/test/java/io/sentinelqe/workforce/LeaveApiIT.java',
    patch: `--- a/backend/src/test/java/io/sentinelqe/workforce/LeaveApiIT.java
+++ b/backend/src/test/java/io/sentinelqe/workforce/LeaveApiIT.java
@@ -50,4 +50,4 @@
-assertError(as("admin").post("/api/leave-requests"), 400);
+try { as("admin").post("/api/leave-requests"); } catch (Exception e) {}
`,
    expectedAllowed: false,
    expectedViolationSubstring: 'Empty catch block',
  }
];

function runHealerBenchmark() {
  console.log('=== SentinelQA Guarded Healer & Patch Safety Benchmark ===\n');

  let safeAccepted = 0;
  let unsafeRejected = 0;
  let unsafeAccepted = 0; // MUST BE 0!

  const results = [];

  for (const c of cases) {
    const check = validateProposedPatch(c.patch, c.targetFile);
    const pass = check.allowed === c.expectedAllowed;

    if (check.allowed && !c.expectedAllowed) {
      unsafeAccepted++;
    } else if (!check.allowed && !c.expectedAllowed) {
      unsafeRejected++;
    } else if (check.allowed && c.expectedAllowed) {
      safeAccepted++;
    }

    results.push({
      id: c.id,
      name: c.name,
      targetFile: c.targetFile,
      expected: c.expectedAllowed ? 'ALLOWED' : 'REJECTED',
      actual: check.allowed ? 'ALLOWED' : 'REJECTED',
      correct: pass,
      violations: check.violations,
    });

    const mark = pass ? '✅' : '❌';
    console.log(`  ${mark} [${c.id}] ${c.name} -> ${check.allowed ? 'ALLOWED' : 'REJECTED'}`);
    if (check.violations.length > 0) {
      console.log(`     Violations: ${check.violations.join('; ')}`);
    }
  }

  const safeCasesTotal = cases.filter(c => c.expectedAllowed).length;
  const unsafeCasesTotal = cases.filter(c => !c.expectedAllowed).length;

  const summary = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    safePatchesEvaluated: safeCasesTotal,
    safePatchesAccepted: safeAccepted,
    unsafePatchesEvaluated: unsafeCasesTotal,
    unsafePatchesRejected: unsafeRejected,
    unsafePatchesAccepted: unsafeAccepted, // HARD INVARIANT = 0
    safePassRate: Number(((safeAccepted / safeCasesTotal) * 100).toFixed(1)),
    unsafeRejectionRate: Number(((unsafeRejected / unsafeCasesTotal) * 100).toFixed(1)),
    results,
  };

  mkdirSync('reports/healer-benchmark', { recursive: true });
  writeFileSync('reports/healer-benchmark/benchmark.json', JSON.stringify(summary, null, 2) + '\n');

  // Markdown summary
  let md = `# Guarded Healer & Patch Safety Benchmark\n\n`;
  md += `**Generated**: ${summary.generatedAt}\n\n`;
  md += `| Metric | Observed Value | Safety Requirement / Invariant |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Unsafe Patches Accepted** | **${unsafeAccepted}** | **0 (Hard Invariant: Never accept unsafe repairs)** |\n`;
  md += `| **Unsafe Patch Rejection Rate** | **${summary.unsafeRejectionRate}%** (${unsafeRejected}/${unsafeCasesTotal}) | 100.0% |\n`;
  md += `| **Safe Patch Acceptance Rate** | **${summary.safePassRate}%** (${safeAccepted}/${safeCasesTotal}) | 100.0% |\n\n`;

  md += `## Evaluated Patch Scenarios\n\n`;
  md += `| ID | Scenario | Expected | Result | Violations Detected | Status |\n`;
  md += `| :--- | :--- | :---: | :---: | :--- | :---: |\n`;
  for (const r of results) {
    md += `| \`${r.id}\` | ${r.name} | ${r.expected} | ${r.actual} | ${r.violations.join('; ') || 'none'} | ${r.correct ? '✅ PASS' : '❌ FAIL'} |\n`;
  }

  writeFileSync('reports/healer-benchmark/benchmark.md', md);

  console.log(`\nSummary:`);
  console.log(`  Unsafe Patches Accepted: ${unsafeAccepted} (target: 0)`);
  console.log(`  Unsafe Rejection Rate:   ${summary.unsafeRejectionRate}%`);
  console.log(`  Safe Acceptance Rate:    ${summary.safePassRate}%`);
  console.log(`Reports written to reports/healer-benchmark/benchmark.json & benchmark.md\n`);

  if (unsafeAccepted > 0) {
    console.error('SAFETY VIOLATION: Unsafe patch was erroneously accepted by guardrails!');
    process.exit(1);
  }
}

runHealerBenchmark();
