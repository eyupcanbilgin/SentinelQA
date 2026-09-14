import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeJunit,
  normalizePlaywright,
  normalizeK6,
  normalizePit,
  normalizeEvals,
  criticalTests,
  testId,
} from '../src/normalize.js';
import { validateConfig, evaluateGate, markdown } from '../src/gate.js';
import type { GateConfig } from '../src/model.js';

const mockValidConfig: GateConfig = {
  schemaVersion: '1.0',
  maxAgeHours: 24,
  profiles: {
    pr: { required: ['unit', 'integration', 'security', 'e2e', 'agentEvals'] },
    nightly: { required: ['unit', 'integration', 'security', 'e2e', 'performance', 'mutation', 'agentEvals'] },
    release: { required: ['unit', 'integration', 'security', 'e2e', 'performance', 'mutation', 'agentEvals'] },
  },
  criticalSecurityIds: ['SEC-AUTHZ-001', 'SEC-AUTHZ-002', 'SEC-AUTHZ-003', 'SEC-AUTHZ-004'],
  criticalE2eIds: ['E2E-LEAVE-001', 'E2E-PAY-001'],
  performance: { maxErrorRate: 0.01, maxP95Ms: 750 },
  mutation: { minimumScore: 0.75 },
  ai: { minimumAccuracy: 0.85, maxUnsafeRecommendationRate: 0 },
};

test('QG-UNIT-001 validateConfig validates schema and rejects invalid inputs', () => {
  const valid = validateConfig(mockValidConfig);
  assert.equal(valid.schemaVersion, '1.0');

  assert.throws(() => validateConfig({ ...mockValidConfig, schemaVersion: '2.0' }));
  assert.throws(() => validateConfig({ ...mockValidConfig, maxAgeHours: -1 }));
  assert.throws(() => validateConfig({ ...mockValidConfig, criticalSecurityIds: ['INVALID-ID'] }));
});

test('QG-UNIT-002 testId extraction recognizes standard quality IDs', () => {
  assert.equal(testId('API_PAY_001_create_run'), 'API-PAY-001');
  assert.equal(testId('io.sentinelqe.workforce.domain.SEC_AUTHZ_002_role_check'), 'SEC-AUTHZ-002');
  assert.equal(testId('E2E-LEAVE-001 employee request'), 'E2E-LEAVE-001');
  assert.equal(testId('unrelated generic test'), '');
});

test('QG-UNIT-003 normalizeJunit parses JUnit XML with pass and fail cases', () => {
  const xmlPass = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="io.sentinelqe.workforce.domain.LeavePolicyTest" tests="2" failures="0" errors="0" skipped="0" timestamp="2026-09-14T10:00:00Z">
  <testcase name="UNIT-LEAVE-001 valid dates" classname="io.sentinelqe.workforce.domain.LeavePolicyTest"/>
  <testcase name="UNIT-LEAVE-002 balance check" classname="io.sentinelqe.workforce.domain.LeavePolicyTest"/>
</testsuite>`;

  const result = normalizeJunit([xmlPass]);
  assert.equal(result.status, 'PASS');
  assert.equal(result.metrics.total, 2);
  assert.equal(result.metrics.passed, 2);
  assert.equal(result.metrics.failed, 0);

  const xmlFail = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="io.sentinelqe.workforce.domain.LeavePolicyTest" tests="1" failures="1" errors="0" skipped="0">
  <testcase name="UNIT-LEAVE-001 valid dates" classname="io.sentinelqe.workforce.domain.LeavePolicyTest">
    <failure message="assertion failed">stacktrace</failure>
  </testcase>
</testsuite>`;

  const resultFail = normalizeJunit([xmlFail]);
  assert.equal(resultFail.status, 'FAIL');
  assert.equal(resultFail.metrics.failed, 1);
});

test('QG-UNIT-004 normalizePlaywright validates critical E2E tests', () => {
  const rawPlaywright = {
    stats: { expected: 2, unexpected: 0, flaky: 0, skipped: 0, startTime: '2026-09-14T10:00:00Z', duration: 1500 },
    errors: [],
    suites: [
      {
        title: 'leave.spec.ts',
        specs: [
          {
            title: 'E2E-LEAVE-001: employee requests leave',
            ok: true,
            tests: [{ status: 'expected', expectedStatus: 'passed', results: [{ status: 'passed' }] }],
          },
          {
            title: 'E2E-PAY-001: admin finalizes payroll',
            ok: true,
            tests: [{ status: 'expected', expectedStatus: 'passed', results: [{ status: 'passed' }] }],
          },
        ],
      },
    ],
  };

  const result = normalizePlaywright(rawPlaywright, ['E2E-LEAVE-001', 'E2E-PAY-001']);
  assert.equal(result.status, 'PASS');
  assert.equal(result.metrics.total, 2);
  assert.equal(result.metrics.passed, 2);

  const missingResult = normalizePlaywright(rawPlaywright, ['E2E-LEAVE-001', 'E2E-PAY-001', 'E2E-MISSING-999']);
  assert.equal(missingResult.status, 'NOT_RUN');
  assert.match(missingResult.reasons[0], /Missing executed critical test/);
});

test('QG-UNIT-005 normalizeK6 evaluates thresholds correctly', () => {
  const k6Success = {
    metrics: {
      http_reqs: { values: { count: 500, rate: 50 }, thresholds: { 'count>100': { ok: true } } },
      http_req_failed: { values: { rate: 0.002 } },
      http_req_duration: { values: { 'p(95)': 350, avg: 120 } },
      checks: { values: { passes: 500, fails: 0, rate: 1.0 } },
    },
  };

  const result = normalizeK6(k6Success, { maxErrorRate: 0.01, maxP95Ms: 750 });
  assert.equal(result.status, 'PASS');

  const k6Failure = {
    metrics: {
      http_reqs: { values: { count: 500, rate: 50 }, thresholds: { 'count>100': { ok: true } } },
      http_req_failed: { values: { rate: 0.05 } },
      http_req_duration: { values: { 'p(95)': 1200, avg: 450 } },
      checks: { values: { passes: 450, fails: 50, rate: 0.9 } },
    },
  };

  const failResult = normalizeK6(k6Failure, { maxErrorRate: 0.01, maxP95Ms: 750 });
  assert.equal(failResult.status, 'FAIL');
  assert.equal(failResult.reasons.length, 3);
});

test('QG-UNIT-006 normalizePit calculates mutation score against threshold', () => {
  const pitXml = `<?xml version="1.0" encoding="UTF-8"?>
<mutations>
  <mutation detected='true' status='KILLED'>
    <mutatedClass>io.sentinelqe.workforce.payroll.PayrollCalculator</mutatedClass>
  </mutation>
  <mutation detected='true' status='KILLED'>
    <mutatedClass>io.sentinelqe.workforce.payroll.PayrollCalculator</mutatedClass>
  </mutation>
  <mutation detected='false' status='SURVIVED'>
    <mutatedClass>io.sentinelqe.workforce.payroll.PayrollCalculator</mutatedClass>
  </mutation>
</mutations>`;

  const pass = normalizePit(pitXml, 0.60);
  assert.equal(pass.status, 'PASS');
  assert.ok(Math.abs(pass.metrics.score - 2 / 3) < 1e-4);

  const fail = normalizePit(pitXml, 0.80);
  assert.equal(fail.status, 'FAIL');
});

test('QG-UNIT-007 normalizeEvals validates accuracy and unsafe action rates', () => {
  const evals = {
    schemaVersion: '1.0',
    generatedAt: '2026-09-14T10:00:00Z',
    total: 25,
    correct: 23,
    accuracy: 23 / 25,
    unsafeRecommendationRate: 0,
  };

  const pass = normalizeEvals(evals, { minimumAccuracy: 0.85, maxUnsafeRecommendationRate: 0 });
  assert.equal(pass.status, 'PASS');

  const lowAcc = {
    ...evals,
    total: 25,
    correct: 18,
    accuracy: 18 / 25,
  };
  const fail = normalizeEvals(lowAcc, { minimumAccuracy: 0.85, maxUnsafeRecommendationRate: 0 });
  assert.equal(fail.status, 'FAIL');
});

test('QG-UNIT-008 markdown formatter produces formatted markdown table', () => {
  const report = {
    schemaVersion: '1.0' as const,
    generatedAt: '2026-09-14T10:00:00Z',
    profile: 'pr' as const,
    decision: 'PASS' as const,
    exitCode: 0,
    recommendation: 'Available quality evidence satisfies configured release criteria.',
    run: null,
    provenanceWarning: 'No run manifest supplied',
    evidence: [
      {
        source: 'unit' as const,
        required: true,
        status: 'PASS' as const,
        availability: 'VALID' as const,
        artifacts: [{ path: 'backend/target/surefire-reports/TEST-unit.xml', bytes: 1200, modifiedAt: '2026-09-14T10:00:00Z', ageHours: 0.1, sha256: 'abc' }],
        metrics: { total: 90, passed: 90 },
        reasons: [],
      }
    ],
    reasons: [],
  };

  const md = markdown(report);
  assert.match(md, /# SentinelQE Quality Gate/);
  assert.match(md, /\| Evidence \| Required \| Status \| Availability \| Metrics \|/);
  assert.match(md, /\| unit \| yes \| PASS \| VALID \|/);
});
