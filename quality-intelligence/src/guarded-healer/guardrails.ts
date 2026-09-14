export interface GuardrailCheckResult {
  allowed: boolean;
  violations: string[];
}

export const FORBIDDEN_PATTERNS = [
  { pattern: /\.skip\b/, description: 'Adding test.skip or it.skip is forbidden' },
  { pattern: /\.only\b/, description: 'Adding test.only or it.only is forbidden' },
  { pattern: /\.toBeDefined\(\)/, description: 'Weakening assertions using .toBeDefined() is forbidden' },
  { pattern: /\.toBeTruthy\(\)/, description: 'Weakening assertions using .toBeTruthy() is forbidden' },
  { pattern: /expect\([^)]+\)\.not\.toThrow/, description: 'Suppressing exceptions in assertions is forbidden' },
  { pattern: /setTimeout\s*\(\s*\d{5,}\s*\)/, description: 'Unconditionally inflating timeouts (>10s) is forbidden' },
  { pattern: /Thread\.sleep\s*\(/, description: 'Arbitrary Thread.sleep is forbidden' },
  { pattern: /expect\(true\)\.toBe\(true\)/, description: 'Tautological assertions are forbidden' },
];

export function validateProposedPatch(patchContent: string, targetFile: string): GuardrailCheckResult {
  const violations: string[] = [];

  // 1. Guardrail: Must not alter production code
  const normalizedTarget = targetFile.replaceAll('\\', '/');
  if (
    normalizedTarget.includes('/src/main/') ||
    (normalizedTarget.includes('frontend/src/') && !normalizedTarget.includes('.test.') && !normalizedTarget.includes('.spec.'))
  ) {
    violations.push('Direct modifications to product/production code are forbidden for automated healing.');
  }

  // 2. Guardrail: Check forbidden code patterns in additions
  const addedLines = patchContent
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.slice(1));

  for (const line of addedLines) {
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push(rule.description);
      }
    }
  }

  // 3. Guardrail: Deleting assertions
  const removedLines = patchContent
    .split('\n')
    .filter(line => line.startsWith('-') && !line.startsWith('---'))
    .map(line => line.slice(1));

  const removedAssertions = removedLines.filter(l => l.includes('expect(') || l.includes('assertThat('));
  const addedAssertions = addedLines.filter(l => l.includes('expect(') || l.includes('assertThat('));
  if (removedAssertions.length > addedAssertions.length) {
    violations.push(`Net removal of ${removedAssertions.length - addedAssertions.length} assertions is forbidden.`);
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}
