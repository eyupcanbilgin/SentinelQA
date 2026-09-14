import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { GateConfig, Normalized, TestRecord } from './model.js';

type Obj = Record<string, any>;
export function object(value: unknown, name: string): Obj {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Obj;
}
export function finite(value: unknown, name: string, min = 0, max = Number.MAX_VALUE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be finite in [${min}, ${max}]`);
  return value;
}
function count(value: unknown, name: string): number {
  const result = finite(value, name);
  if (!Number.isSafeInteger(result)) throw new Error(`${name} must be an integer`);
  return result;
}
function xmlCount(value: unknown, name: string): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error(`${name} is missing or invalid`);
  return count(Number(value), name);
}
function list(value: any): any[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function xml(text: string): Obj {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('DTD/entity declarations are not accepted');
  const validation = XMLValidator.validate(text);
  if (validation !== true) throw new Error(`Malformed XML: ${validation.err.msg}`);
  return object(new XMLParser({ ignoreAttributes: false, parseTagValue: false, parseAttributeValue: false }).parse(text), 'XML');
}
export function testId(name: string): string {
  return name.toUpperCase().replaceAll('_', '-').match(/\b(?:SEC|API|E2E|INT|UNIT)-[A-Z]+-\d{3}\b/)?.[0] ?? '';
}
function summary(tests: TestRecord[], extra: string[] = []): Normalized {
  if (!tests.length) throw new Error('Report contains zero tests');
  const passed = tests.filter(test => test.outcome === 'PASS').length;
  const failed = tests.filter(test => test.outcome === 'FAIL').length;
  const skipped = tests.filter(test => test.outcome === 'SKIPPED').length;
  return {
    status: failed || extra.length ? 'FAIL' : passed ? 'PASS' : 'NOT_RUN',
    metrics: { total: tests.length, passed, failed, skipped }, tests,
    reasons: [...(failed ? [`${failed} test(s) failed`] : []), ...(skipped ? [`${skipped} test(s) skipped`] : []), ...extra],
  };
}
export function normalizeJunit(texts: string[]): Normalized {
  const tests: TestRecord[] = [];
  for (const text of texts) {
    const root = xml(text);
    const visit = (suite: Obj): TestRecord[] => {
      object(suite, 'testsuite');
      const cases: TestRecord[] = list(suite.testcase).map((raw: unknown) => {
        const testcase = object(raw, 'testcase');
        if (typeof testcase['@_name'] !== 'string' || !testcase['@_name'].trim()) throw new Error('testcase name is required');
        const name = `${testcase['@_classname'] ?? ''} ${testcase['@_name']}`.trim();
        const failure = testcase.failure !== undefined || testcase.error !== undefined || testcase.flakyFailure !== undefined || testcase.rerunFailure !== undefined;
        const skipped = testcase.skipped !== undefined;
        if (failure && skipped) throw new Error(`Contradictory failed and skipped testcase ${name}`);
        return { id: testId(name), name, outcome: failure ? 'FAIL' : skipped ? 'SKIPPED' : 'PASS' };
      });
      const nested = list(suite.testsuite).flatMap(visit);
      const all = [...cases, ...nested];
      const total = xmlCount(suite['@_tests'], 'testsuite.tests');
      const failures = xmlCount(suite['@_failures'], 'testsuite.failures');
      const errors = xmlCount(suite['@_errors'], 'testsuite.errors');
      const skipped = suite['@_skipped'] === undefined ? 0 : xmlCount(suite['@_skipped'], 'testsuite.skipped');
      if (total !== all.length || failures + errors !== all.filter(t => t.outcome === 'FAIL').length || skipped !== all.filter(t => t.outcome === 'SKIPPED').length) {
        throw new Error('JUnit declared counts contradict testcase outcomes');
      }
      return all;
    };
    let parsed: TestRecord[];
    if (root.testsuite !== undefined) parsed = list(root.testsuite).flatMap(visit);
    else if (root.testsuites !== undefined) {
      const parent = object(root.testsuites, 'testsuites');
      parsed = list(parent.testsuite).flatMap(visit);
      for (const [key, actual] of Object.entries({ tests: parsed.length, failures: parsed.filter(t => t.outcome === 'FAIL').length, skipped: parsed.filter(t => t.outcome === 'SKIPPED').length })) {
        if (parent[`@_${key}`] !== undefined && key !== 'failures' && xmlCount(parent[`@_${key}`], `testsuites.${key}`) !== actual) throw new Error('JUnit aggregate counts contradict testcase outcomes');
      }
    } else throw new Error('Expected JUnit testsuite or testsuites');
    if (!parsed.length) throw new Error('JUnit artifact contains zero tests');
    tests.push(...parsed);
  }
  return summary(tests);
}
export function criticalTests(input: Normalized, ids: string[]): Normalized {
  const tests = (input.tests ?? []).filter(test => ids.includes(test.id));
  const absent = ids.filter(id => !tests.some(test => test.id === id && test.outcome !== 'SKIPPED'));
  const failed = tests.filter(test => test.outcome === 'FAIL');
  return {
    status: failed.length ? 'FAIL' : absent.length ? 'NOT_RUN' : 'PASS',
    tests,
    metrics: { required: ids.length, observed: new Set(tests.map(test => test.id)).size, failed: failed.length },
    reasons: [...absent.map(id => `Missing executed critical test ${id}`), ...failed.map(test => `Critical test failed: ${test.id}`)],
  };
}
export function normalizePlaywright(value: unknown, requiredIds: string[]): Normalized {
  const root = object(value, 'Playwright report');
  const stats = object(root.stats, 'Playwright stats');
  const actual = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  const tests: TestRecord[] = [];
  const problems: string[] = [];
  const visit = (suites: unknown): void => {
    if (!Array.isArray(suites)) throw new Error('Playwright suites must be an array');
    for (const raw of suites) {
      const suite = object(raw, 'Playwright suite');
      if (suite.suites !== undefined) visit(suite.suites);
      if (!Array.isArray(suite.specs)) throw new Error('Playwright specs must be an array');
      for (const rawSpec of suite.specs) {
        const spec = object(rawSpec, 'Playwright spec');
        if (typeof spec.title !== 'string' || !Array.isArray(spec.tests) || !spec.tests.length) throw new Error('Playwright spec must contain title and tests');
        for (const rawTest of spec.tests) {
          const test = object(rawTest, 'Playwright test');
          if (!Object.hasOwn(actual, test.status)) throw new Error('Unknown Playwright outcome');
          actual[test.status as keyof typeof actual]++;
          if (!Array.isArray(test.results)) throw new Error('Playwright test results must be an array');
          const final = test.results.at(-1)?.status;
          if (test.status !== 'skipped' && !test.results.length) throw new Error('Executed Playwright test has no result');
          if (test.status === 'expected' && final !== test.expectedStatus) throw new Error('Playwright expected status contradicts actual final result');
          if (test.status === 'skipped' && test.results.some((r: Obj) => r.status !== 'skipped')) throw new Error('Playwright skipped status contradicts results');
          const failedAttempt = test.results.some((r: Obj) => !['passed', 'skipped'].includes(r.status));
          const outcome = test.status === 'skipped' ? 'SKIPPED' : test.status === 'expected' && final === 'passed' && !failedAttempt ? 'PASS' : 'FAIL';
          tests.push({ id: testId(spec.title), name: spec.title, outcome });
        }
      }
    }
  };
  visit(root.suites);
  for (const key of Object.keys(actual) as (keyof typeof actual)[]) if (count(stats[key], `stats.${key}`) !== actual[key]) throw new Error('Playwright stats contradict individual outcomes');
  if (!Array.isArray(root.errors)) throw new Error('Playwright errors must be an array');
  if (root.errors.length) problems.push(`${root.errors.length} Playwright runner error(s)`);
  const result = summary(tests, problems);
  const critical = criticalTests(result, requiredIds);
  if (result.status === 'PASS' && critical.status !== 'PASS') result.status = critical.status;
  result.reasons.push(...critical.reasons);
  return result;
}
export function normalizeK6(value: unknown, config: GateConfig['performance']): Normalized {
  const metrics = object(object(value, 'k6 report').metrics, 'k6 metrics');
  const values = (name: string): Obj => {
    const m = object(metrics[name], name);
    if (m.values && typeof m.values === 'object') return m.values as Obj;
    return m;
  };
  const requests = count(values('http_reqs').count, 'http_reqs.count');
  if (!requests) throw new Error('k6 report contains zero requests');
  const errorRate = finite(values('http_req_failed').rate !== undefined ? values('http_req_failed').rate : values('http_req_failed').value, 'http_req_failed.rate', 0, 1);
  const p95Ms = finite(values('http_req_duration')['p(95)'], 'http_req_duration.p(95)');
  const checks = values('checks');
  const checksPassed = count(checks.passes, 'checks.passes');
  const checksFailed = count(checks.fails, 'checks.fails');
  const checkRate = finite(checks.rate !== undefined ? checks.rate : checks.value, 'checks.rate', 0, 1);
  if (!checksPassed && !checksFailed) throw new Error('k6 report has zero checks');
  if (Math.abs(checkRate - checksPassed / (checksPassed + checksFailed)) > 1e-8) throw new Error('k6 check rate contradicts counts');
  const reasons: string[] = [];
  if (errorRate > config.maxErrorRate) reasons.push(`Error rate ${errorRate} exceeds ${config.maxErrorRate}`);
  if (p95Ms > config.maxP95Ms) reasons.push(`HTTP p95 ${p95Ms}ms exceeds ${config.maxP95Ms}ms`);
  if (checksFailed) reasons.push(`${checksFailed} k6 business check(s) failed`);
  let thresholds = 0;
  for (const [name, raw] of Object.entries(metrics)) {
    const metric = object(raw, `metric ${name}`);
    if (metric.thresholds === undefined) continue;
    for (const [expression, rawThreshold] of Object.entries(object(metric.thresholds, 'thresholds'))) {
      let ok: boolean;
      if (typeof rawThreshold === 'boolean') {
        // In k6 summary-export JSON: false indicates no failure / threshold passed; true indicates threshold breached.
        // Or if object: { ok: boolean }
        ok = !rawThreshold;
      } else if (typeof rawThreshold === 'object' && rawThreshold !== null && typeof (rawThreshold as { ok?: unknown }).ok === 'boolean') {
        ok = (rawThreshold as { ok: boolean }).ok;
      } else {
        throw new Error(`Threshold ${name}/${expression} has unexpected format`);
      }
      thresholds++;
      if (!ok) reasons.push(`k6 threshold failed: ${name} ${expression}`);
    }
  }
  if (!thresholds) throw new Error('k6 summary has no evaluated thresholds');
  return { status: reasons.length ? 'FAIL' : 'PASS', metrics: { requests, errorRate, p95Ms, checksPassed, checksFailed, thresholds }, reasons };
}
export function normalizePit(text: string, minimum: number): Normalized {
  const mutations = list(object(xml(text).mutations, 'PIT mutations').mutation);
  if (!mutations.length) throw new Error('PIT report contains zero mutations');
  let killed = 0;
  const reasons: string[] = [];
  const statuses = ['KILLED', 'SURVIVED', 'NO_COVERAGE', 'TIMED_OUT', 'NON_VIABLE', 'MEMORY_ERROR', 'RUN_ERROR'];
  for (const raw of mutations) {
    const mutation = object(raw, 'PIT mutation');
    if (!statuses.includes(mutation['@_status'])) throw new Error('Unknown PIT mutation status');
    if (!['true', 'false'].includes(mutation['@_detected'])) throw new Error('PIT detected attribute missing');
    const detected = mutation['@_detected'] === 'true';
    if ((mutation['@_status'] === 'KILLED' && !detected) || (['SURVIVED', 'NO_COVERAGE'].includes(mutation['@_status']) && detected)) throw new Error('PIT detected flag contradicts mutation status');
    if (mutation['@_status'] === 'KILLED') killed++;
    if (['NON_VIABLE', 'MEMORY_ERROR', 'RUN_ERROR'].includes(mutation['@_status'])) reasons.push(`PIT infrastructure/invalid mutant: ${mutation['@_status']}`);
  }
  // Timeout is not credited as a kill: slow or broken infrastructure must not improve this score.
  const score = killed / mutations.length;
  if (score < minimum) reasons.push(`Mutation score ${score.toFixed(4)} is below ${minimum}`);
  return { status: reasons.length ? 'FAIL' : 'PASS', metrics: { total: mutations.length, killed, score, scoreDefinition: 'KILLED / all emitted mutants; timeouts earn no credit' }, reasons };
}
export function normalizeEvals(value: unknown, config: GateConfig['ai']): Normalized {
  const report = object(value, 'Agent evaluation');
  if (report.schemaVersion !== '1.0') throw new Error('Unsupported agent evaluation schemaVersion');
  if (typeof report.generatedAt !== 'string' || !Number.isFinite(Date.parse(report.generatedAt))) throw new Error('Agent evaluation generatedAt missing/invalid');
  const total = count(report.total, 'evaluation.total');
  const correct = count(report.correct, 'evaluation.correct');
  if (!total || correct > total) throw new Error('Evaluation counts are zero or contradictory');
  const accuracy = finite(report.accuracy, 'evaluation.accuracy', 0, 1);
  if (Math.abs(accuracy - correct / total) > 1e-8) throw new Error('Evaluation accuracy contradicts counts');
  const unsafeRate = finite(report.unsafeRecommendationRate, 'evaluation.unsafeRecommendationRate', 0, 1);
  if (report.abstentions !== undefined && count(report.abstentions, 'evaluation.abstentions') > total) throw new Error('Abstentions exceed total');
  const reasons: string[] = [];
  if (accuracy < config.minimumAccuracy) reasons.push(`Triage accuracy ${accuracy} is below ${config.minimumAccuracy}`);
  if (unsafeRate > config.maxUnsafeRecommendationRate) reasons.push(`Unsafe recommendation rate ${unsafeRate} exceeds ${config.maxUnsafeRecommendationRate}`);
  return {
    status: reasons.length ? 'FAIL' : 'PASS',
    metrics: {
      datasetType: typeof report.datasetType === 'string' ? report.datasetType : 'development',
      datasetVersion: typeof report.datasetVersion === 'string' ? report.datasetVersion : 'UNREPORTED',
      provider: typeof report.provider === 'string' ? report.provider : 'rules',
      total,
      correct,
      accuracy,
      unsafeRecommendationRate: unsafeRate,
    },
    reasons,
  };
}
