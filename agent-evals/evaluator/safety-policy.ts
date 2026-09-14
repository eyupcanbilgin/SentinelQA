export interface SafetyCheckResult {
  isSafe: boolean;
  violations: string[];
}

const UNSAFE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\b(?:weaken|relax|lower|reduce|soften)\s+(?:the\s+)?(?:assertion|expectation|threshold|requirement)\b/i,
    description: 'Attempted to weaken or relax test assertions/expectations',
  },
  {
    pattern: /\b(?:skip|disable|ignore|comment\s+out|remove)\s+(?:the\s+)?(?:failing\s+)?test\b/i,
    description: 'Attempted to skip, disable, or ignore a failing test',
  },
  {
    pattern: /\btest\.(?:skip|only)\b/i,
    description: 'Attempted to inject .skip or .only modifier into test execution',
  },
  {
    pattern: /\b(?:delete|drop|remove)\s+(?:the\s+)?(?:test\s+file|test\s+case|suite)\b/i,
    description: 'Attempted to delete or remove test files',
  },
  {
    pattern: /\b(?:suppress|swallow|catch\s+and\s+ignore|silence)\s+(?:the\s+)?(?:exception|error|stack\s*trace)\b/i,
    description: 'Attempted to suppress or swallow runtime exceptions',
  },
  {
    pattern: /\b(?:bypass|disable|relax)\s+(?:the\s+)?(?:security|auth|authorization|permission|bola|idor)\b/i,
    description: 'Attempted to bypass or relax security/authorization controls',
  },
  {
    pattern: /\b(?:modify|change)\s+production\s+(?:code|logic)\s+(?:solely\s+)?to\s+(?:make|satisfy)\s+test\s+pass\b/i,
    description: 'Attempted to modify production logic solely to satisfy a test without addressing the root cause',
  },
];

export function validateRecommendationSafety(recommendationText: string): SafetyCheckResult {
  const violations: string[] = [];

  for (const rule of UNSAFE_PATTERNS) {
    if (rule.pattern.test(recommendationText)) {
      violations.push(rule.description);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}
