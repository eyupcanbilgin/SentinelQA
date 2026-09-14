import { proposeHealing } from './healer.js';

function main() {
  console.log('=== SentinelQE Guarded Test Healer ===');
  console.log('Analyzing test failure and checking against AI guardrails...\n');

  // Example demonstration of guarded healing
  const sample = proposeHealing({
    testId: 'E2E-LEAVE-001',
    targetFile: 'tests/e2e/specs/leave.spec.ts',
    originalCode: "await page.locator('button.btn-submit-action').click();",
    healedCode: "await page.getByRole('button', { name: 'Submit Leave Request' }).click();",
    explanation: 'Migrated brittle CSS class selector to semantic accessibility locator (getByRole).'
  });

  console.log(`Target: ${sample.targetFile} (${sample.testId})`);
  console.log(`Guardrails: ${sample.guardrailResult.allowed ? 'PASSED (Safe to propose)' : 'FAILED'}`);
  if (!sample.guardrailResult.allowed) {
    sample.guardrailResult.violations.forEach(v => console.log(`  [VIOLATION] ${v}`));
  }
  console.log('\nProposed Unified Diff:');
  console.log(sample.suggestedPatch);
  console.log(`\nExplanation: ${sample.explanation}`);
  console.log('\nNOTE: Guarded healing NEVER auto-commits or modifies product code. Human review required.');
}

main();
