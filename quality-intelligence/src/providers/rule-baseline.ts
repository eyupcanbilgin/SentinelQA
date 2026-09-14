import type { AiProvider, StructuredAiRequest } from './provider.js';
import { type TriageResult, TriageResultSchema } from '../failure-triage/schema.js';
import { type FailureEvidence } from '../failure-triage/evidence.js';

export class RuleBasedTriageBaseline implements AiProvider {
  readonly name = 'rule-based-baseline';

  async generateStructured<T>(request: StructuredAiRequest<T>): Promise<T> {
    const evidence = request.evidence as FailureEvidence;
    const triage = this.classifyEvidence(evidence);
    return TriageResultSchema.parse(triage) as unknown as T;
  }

  private classifyEvidence(e: FailureEvidence): TriageResult {
    const allLogs = [
      e.errorMessage,
      e.stackTrace ?? '',
      ...(e.backendLogs ?? []),
      ...(e.networkLogs ?? []),
      ...(e.consoleLogs ?? []),
    ].join('\n').toLowerCase();

    // 1. Check for flaky test signals first (retry pass / intermittent)
    if (e.retryHistory?.passedOnRetry || e.retryHistory?.intermittent) {
      return {
        schemaVersion: '1.0',
        classification: 'FLAKY_TEST',
        confidence: 0.92,
        suspectedComponent: e.component ?? 'test-suite',
        evidence: [
          `Test passed on retry attempt ${e.retryHistory.attemptCount}`,
          `Intermittent failure detected without code modifications`,
          `Initial failure message: ${e.errorMessage.slice(0, 100)}`
        ],
        recommendedOwner: 'qa',
        recommendedNextAction: 'Review test synchronization, wait conditions, and shared state isolation.',
        disclaimer: 'Deterministic rule baseline suggests this classification based on retry state; human review is required.'
      };
    }

    // 2. Check for environment issues
    if (
      allLogs.includes('econnrefused') ||
      allLogs.includes('connection refused') ||
      allLogs.includes('connection timed out') ||
      allLogs.includes('host unreachable') ||
      allLogs.includes('docker') ||
      allLogs.includes('bad gateway') ||
      allLogs.includes('service unavailable') ||
      allLogs.includes('cannot connect to postgres') ||
      allLogs.includes('port 5432') ||
      allLogs.includes('redis:6379') ||
      e.httpStatus === 502 ||
      e.httpStatus === 503 ||
      e.httpStatus === 504
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'ENVIRONMENT',
        confidence: 0.94,
        suspectedComponent: 'infrastructure',
        evidence: [
          `Detected infrastructure/network outage signal in error logs`,
          `HTTP status: ${e.httpStatus ?? 'N/A'}`,
          `Error: ${e.errorMessage.slice(0, 100)}`
        ],
        recommendedOwner: 'devops',
        recommendedNextAction: 'Verify container health, port bindings, and database connectivity.',
        disclaimer: 'Deterministic rule baseline suggests this classification based on error keywords; human review is required.'
      };
    }

    // 3. Check for test data issues
    if (
      allLogs.includes('duplicate key value violates unique constraint') ||
      allLogs.includes('record not found') ||
      allLogs.includes('user not found') ||
      allLogs.includes('foreign key constraint') ||
      allLogs.includes('test_data') ||
      allLogs.includes('seed data missing') ||
      allLogs.includes('missing seed data') ||
      allLogs.includes('dirty database state') ||
      allLogs.includes('stale data') ||
      allLogs.includes('entitynotfoundexception')
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'TEST_DATA',
        confidence: 0.88,
        suspectedComponent: e.component ?? 'database',
        evidence: [
          `Database constraint, missing seed record, or dirty fixture state detected`,
          `Error context: ${e.errorMessage.slice(0, 100)}`
        ],
        recommendedOwner: 'qa',
        recommendedNextAction: 'Reset test fixture database state or ensure atomic isolation between test suites.',
        disclaimer: 'Deterministic rule baseline suggests this classification based on error keywords; human review is required.'
      };
    }

    // 4. Check for product defects (business invariant violations, tax calculation, BOLA, unhandled backend 500)
    if (
      allLogs.includes('tax calculation') ||
      allLogs.includes('cannot finalize already finalized payroll') ||
      allLogs.includes('insufficient balance') ||
      allLogs.includes('bola') ||
      allLogs.includes('idor') ||
      allLogs.includes('domainexception') ||
      allLogs.includes('illegalstateexception') ||
      (e.httpStatus === 500 && !allLogs.includes('fixture') && !allLogs.includes('testcleanup'))
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'PRODUCT_DEFECT',
        confidence: 0.91,
        suspectedComponent: e.component ?? 'backend',
        evidence: [
          `Backend unhandled exception or business domain invariant violation`,
          `HTTP Status: ${e.httpStatus ?? 500}`,
          `Error: ${e.errorMessage.slice(0, 100)}`
        ],
        recommendedOwner: 'backend',
        recommendedNextAction: 'Inspect correlated backend logs and trace IDs around timestamp; patch domain service logic.',
        disclaimer: 'Deterministic rule baseline suggests this classification based on error keywords; human review is required.'
      };
    }

    // 5. Check for test defects (locators, expect mismatch, timeouts in test harness)
    if (
      allLogs.includes('waiting for selector') ||
      allLogs.includes('waiting for locator') ||
      allLogs.includes('waiting for element') ||
      allLogs.includes('element not found') ||
      allLogs.includes('target closed') ||
      allLogs.includes('timeout') && allLogs.includes('exceeded') ||
      allLogs.includes('expect(received)') ||
      allLogs.includes('assertionerror') ||
      allLogs.includes('stale element reference') ||
      allLogs.includes('strict mode violation')
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'TEST_DEFECT',
        confidence: 0.86,
        suspectedComponent: e.component ?? 'frontend-tests',
        evidence: [
          `UI locator timeout or assertion mismatch indicative of test automation drift`,
          `Error: ${e.errorMessage.slice(0, 100)}`
        ],
        recommendedOwner: 'qa',
        recommendedNextAction: 'Review selector resilience, use semantic role-based locators, or update outdated test expectations.',
        disclaimer: 'Deterministic rule baseline suggests this classification based on error keywords; human review is required.'
      };
    }

    // 6. Fallback to UNKNOWN (conservative abstention)
    return {
      schemaVersion: '1.0',
      classification: 'UNKNOWN',
      confidence: 0.40,
      suspectedComponent: 'unknown',
      evidence: [
        'Insufficient or contradictory diagnostic evidence to reach deterministic classification',
        `Error: ${e.errorMessage.slice(0, 100)}`
      ],
      recommendedOwner: 'triage-team',
      recommendedNextAction: 'Enrich failure bundle with correlation IDs, OpenTelemetry traces, or full stack traces.',
      disclaimer: 'Deterministic rule baseline abstained due to low confidence; human triage required.'
    };
  }
}
