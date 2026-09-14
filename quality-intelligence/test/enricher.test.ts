import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitiveData, enrichFailureEvidence, type TraceSummary } from '../src/evidence-enrichment/enricher.js';
import { type FailureEvidence } from '../src/failure-triage/evidence.js';

test('OE-ENRICH-001 redactSensitiveData strips Bearer tokens and passwords', () => {
  const dirty = 'Error with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c and password=Secret123!';
  const { redacted, count } = redactSensitiveData(dirty);

  assert.ok(!redacted.includes('eyJhbGciOiJIUzI1Ni'));
  assert.ok(!redacted.includes('Secret123!'));
  assert.ok(redacted.includes('[REDACTED_JWT]'));
  assert.ok(redacted.includes('password=[REDACTED]'));
  assert.equal(count, 2);
});

test('OE-ENRICH-002 enrichFailureEvidence incorporates trace summary and redacts logs', async () => {
  const rawEvidence: FailureEvidence = {
    testId: 'QI-ENRICH-SAMPLE',
    testName: 'asyncPayrollProcessing',
    layer: 'api',
    component: 'payroll',
    errorMessage: '500 Server Error for Bearer eyJhbGciOiJIUzI1Ni.fake.token',
    correlationId: 'test-corr-12345',
    backendLogs: [
      'Failed with {"password": "adminPassword"} at /api/payroll-runs/1/process',
    ],
  };

  const simulatedTrace: TraceSummary = {
    traceId: '0e03f6254570489551045db2490447ac',
    durationMs: 2540,
    rootSpan: 'POST /api/payroll-runs/{id}/process',
    failingSpan: 'calculateTax',
    spanCount: 4,
    spans: [
      { spanId: 'span-1', name: 'POST /api/payroll-runs/{id}/process', durationMs: 2540, status: 'ERROR' },
      { spanId: 'span-2', name: 'calculateTax', durationMs: 2100, status: 'ERROR', errorDetails: 'Tax calculation overflow' },
    ],
  };

  const enriched = await enrichFailureEvidence(rawEvidence, { simulatedTrace });

  assert.equal(enriched.telemetrySource, 'synthetic');
  assert.equal(enriched.traceId, '0e03f6254570489551045db2490447ac');
  assert.equal(enriched.traceSummary?.failingSpan, 'calculateTax');
  assert.equal(enriched.traceSummary?.spans.length, 2);

  // Verify redactions took effect
  assert.ok(!enriched.errorMessage.includes('fake.token'));
  assert.ok(enriched.errorMessage.includes('[REDACTED_JWT]'));
  assert.ok(!enriched.backendLogs![0].includes('adminPassword'));
  assert.ok(enriched.backendLogs![0].includes('[REDACTED]'));
  assert.ok(enriched.redactedFieldsCount! >= 2);
});
