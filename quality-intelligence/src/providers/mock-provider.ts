import type { AiProvider, StructuredAiRequest } from './provider.js';
import { type TriageResult, type TriageClassification, TriageResultSchema } from '../failure-triage/schema.js';
import { type FailureEvidence } from '../failure-triage/evidence.js';

export class MockAiProvider implements AiProvider {
  readonly name = 'mock-deterministic';

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

    // 1. Check for flaky test signals first
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
        disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
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
          `Connection/infrastructure error: ${e.errorMessage.slice(0, 120)}`,
          e.httpStatus ? `HTTP gateway error: ${e.httpStatus}` : 'Network level failure reaching backend dependency',
          e.traceId ? `Trace ID recorded: ${e.traceId}` : 'No active trace could be completed'
        ],
        recommendedOwner: 'devops',
        recommendedNextAction: 'Check container health, database port binding, and service availability.',
        disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
      };
    }

    // 3. Check for test data conflicts
    if (
      allLogs.includes('unique constraint') ||
      allLogs.includes('duplicate key value violates unique constraint') ||
      allLogs.includes('entitynotfoundexception') ||
      allLogs.includes('foreign key constraint') ||
      allLogs.includes('pre-existing test data') ||
      allLogs.includes('seed conflict') ||
      allLogs.includes('stale data')
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'TEST_DATA',
        confidence: 0.90,
        suspectedComponent: e.component ?? 'database',
        evidence: [
          `Test data or constraint collision: ${e.errorMessage.slice(0, 120)}`,
          'Database logs indicate unique key violation or missing fixture seed entity',
          e.correlationId ? `Correlation ID: ${e.correlationId}` : 'No correlation ID'
        ],
        recommendedOwner: 'qa',
        recommendedNextAction: 'Ensure unique randomized identifiers in test fixtures and proper teardown cleanup.',
        disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
      };
    }

    // 4. Check for product defects
    if (
      e.httpStatus === 500 ||
      allLogs.includes('internal server error') ||
      allLogs.includes('nullpointerexception') ||
      allLogs.includes('domainexception') ||
      allLogs.includes('business invariant violated') ||
      allLogs.includes('illegalstateexception: finalized payroll') ||
      allLogs.includes('double finalize') ||
      allLogs.includes('tax calculation discrepancy') ||
      allLogs.includes('leave balance underflow') ||
      allLogs.includes('status code: 500')
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'PRODUCT_DEFECT',
        confidence: 0.91,
        suspectedComponent: e.component ?? 'backend-domain',
        evidence: [
          `Server returned HTTP 500 or threw domain exception: ${e.errorMessage.slice(0, 120)}`,
          'Backend logs show unhandled domain exception or business rule breach',
          e.correlationId ? `Correlation ID: ${e.correlationId}` : 'Correlation ID captured in response headers'
        ],
        recommendedOwner: 'backend',
        recommendedNextAction: 'Inspect domain service invariants, entity state transitions, and server exception logs.',
        disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
      };
    }

    // 5. Check for test defects (UI selector changes, test expectation mismatch on 200/400, assertion errors)
    if (
      allLogs.includes('waiting for selector') ||
      allLogs.includes('locator.click: target closed') ||
      allLogs.includes('strict mode violation') ||
      allLogs.includes('expected: <') ||
      allLogs.includes('expect(received).to') ||
      allLogs.includes('assertionerror') ||
      allLogs.includes('timed out waiting for element') ||
      allLogs.includes('cannot read properties of undefined (reading')
    ) {
      return {
        schemaVersion: '1.0',
        classification: 'TEST_DEFECT',
        confidence: 0.88,
        suspectedComponent: e.component ?? (e.layer === 'e2e' ? 'frontend-tests' : 'api-tests'),
        evidence: [
          `Assertion or locator resolution failed: ${e.errorMessage.slice(0, 120)}`,
          e.layer === 'e2e' ? 'Playwright DOM locator did not match rendered accessibility tree' : 'Test assertion mismatch against contract',
          e.screenshotPath ? `Screenshot available at ${e.screenshotPath}` : 'No screenshot'
        ],
        recommendedOwner: 'qa',
        recommendedNextAction: 'Update semantic locator (e.g. getByRole) or align test expectation with updated schema.',
        disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
      };
    }

    // 6. Unknown fallback
    return {
      schemaVersion: '1.0',
      classification: 'UNKNOWN',
      confidence: 0.40,
      suspectedComponent: e.component ?? 'unknown',
      evidence: [
        `Ambiguous failure: ${e.errorMessage.slice(0, 100)}`,
        'Signals do not distinctly match known defect, data, or environment patterns'
      ],
      recommendedOwner: 'triage-team',
      recommendedNextAction: 'Conduct manual investigation using correlated traces and server logs.',
      disclaimer: 'AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'
    };
  }
}
