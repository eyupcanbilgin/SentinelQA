export interface PatchMetrics {
  assertionsBefore: number;
  assertionsAfter: number;
  skippedBefore: number;
  skippedAfter: number;
  addedTimeouts: number;
}

export interface GuardrailCheckResult {
  allowed: boolean;
  violations: string[];
  metrics: PatchMetrics;
  humanApprovalRequired: true;
}

export const FORBIDDEN_PATTERNS = [
  { pattern: /\btest\.(?:skip|only)\b/i, description: 'Injecting test.skip or test.only modifier is forbidden' },
  { pattern: /\bit\.(?:skip|only)\b/i, description: 'Injecting it.skip or it.only modifier is forbidden' },
  { pattern: /@Disabled\b/, description: 'Adding @Disabled annotation to JUnit test is forbidden' },
  { pattern: /\.(?:toBeDefined|toBeTruthy|isNotNull|isNotEqualTo\(null\))\(\)/, description: 'Weakening strict equality assertions to generic non-null checks is forbidden' },
  { pattern: /expect\([^)]+\)\.not\.toThrow/, description: 'Suppressing exceptions in assertions is forbidden' },
  { pattern: /(?:setTimeout|sleep|waitForTimeout)\s*\([^)]*\b\d{5,}\b/, description: 'Unconditionally inflating timeouts (>10s) is forbidden' },
  { pattern: /Thread\.sleep\s*\(/, description: 'Injecting arbitrary Thread.sleep is forbidden; use deterministic await/polling' },
  { pattern: /expect\(true\)\.toBe\(true\)/, description: 'Injecting tautological assertions is forbidden' },
  { pattern: /catch\s*\([^)]*\)\s*\{\s*\}/, description: 'Empty catch block suppressing test errors is forbidden' },
];

const APPROVED_TEST_PATHS = [
  /^backend\/src\/test\//,
  /^tests\/e2e\//,
  /^quality-intelligence\/test\//,
  /^quality-gate\/test\//,
];

export function validateProposedPatch(patchContent: string, targetFile: string): GuardrailCheckResult {
  const violations: string[] = [];
  const normalizedTarget = targetFile.replaceAll('\\', '/').replace(/^\.\//, '');

  // 1. Guardrail: Path validation - strictly test-only directories
  const isApprovedTestPath = APPROVED_TEST_PATHS.some(p => p.test(normalizedTarget));
  if (!isApprovedTestPath) {
    violations.push(
      `File path "${normalizedTarget}" is outside approved test directories. Automated repair can NEVER modify production or system configuration.`
    );
  }

  if (
    normalizedTarget.includes('/src/main/') ||
    (normalizedTarget.includes('frontend/src/') && !normalizedTarget.includes('.test.') && !normalizedTarget.includes('.spec.'))
  ) {
    violations.push('Direct modifications to product/production code are strictly forbidden for automated healing.');
  }

  const lines = patchContent.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).map(l => l.slice(1));

  // 2. Compute semantic patch metrics
  const countMatches = (linesList: string[], regex: RegExp) =>
    linesList.reduce((acc, line) => acc + (regex.test(line) ? 1 : 0), 0);

  const assertionPattern = /\b(?:expect\(|assertThat\(|assert\.(?:equal|deepEqual|ok|strictEqual))/;
  const skipPattern = /\b(?:\.skip|@Disabled)\b/;

  const assertionsRemoved = countMatches(removedLines, assertionPattern);
  const assertionsAdded = countMatches(addedLines, assertionPattern);
  const skipsRemoved = countMatches(removedLines, skipPattern);
  const skipsAdded = countMatches(addedLines, skipPattern);
  const timeoutsAdded = countMatches(addedLines, /setTimeout|pollInterval|Duration\.ofSeconds\(\s*\d{2,}\s*\)/);

  // 3. Guardrail: Forbid net removal of assertions
  if (assertionsRemoved > assertionsAdded) {
    violations.push(
      `Net assertion removal detected: ${assertionsRemoved} removed vs ${assertionsAdded} added. Weakening test coverage is forbidden.`
    );
  }

  // 4. Guardrail: Forbid adding skips
  if (skipsAdded > skipsRemoved) {
    violations.push('Adding test skips or @Disabled annotations is forbidden.');
  }

  // 5. Guardrail: Check forbidden code patterns in additions
  for (const line of addedLines) {
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push(rule.description);
      }
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
    metrics: {
      assertionsBefore: assertionsRemoved,
      assertionsAfter: assertionsAdded,
      skippedBefore: skipsRemoved,
      skippedAfter: skipsAdded,
      addedTimeouts: timeoutsAdded,
    },
    humanApprovalRequired: true,
  };
}
