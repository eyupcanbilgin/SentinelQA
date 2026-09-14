import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const password = __ENV.DEMO_PASSWORD || 'LocalDemo!2026';
const employeeId = '00000000-0000-0000-0000-000000000001';
const businessErrors = new Rate('business_errors');
const payrollCompletion = new Trend('payroll_completion_ms', true);
const leaveTransaction = new Trend('leave_transaction_ms', true);
const completedPayrolls = new Counter('payroll_completed');
let correlationSequence = 0;

export function thresholds(payrollP95 = 2500) {
  return {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{operation:employee-read}': ['p(95)<800'],
    'http_req_duration{operation:login}': ['p(95)<1000'],
    checks: ['rate==1'],
    business_errors: ['rate==0'],
    leave_transaction_ms: ['p(95)<1500'],
    payroll_completion_ms: [`p(95)<${payrollP95}`],
    payroll_completed: ['count>0'],
  };
}

function request(method, path, token, body, operation, runId) {
  const correlation = `perf-${runId || 'setup'}-${__VU}-${correlationSequence++}-${operation}`;
  return http.request(method, `${baseUrl}${path}`, body === undefined ? null : JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-Correlation-ID': correlation },
    tags: { name: `${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, ':id')}`, operation },
    timeout: '10s',
  });
}

function json(response) {
  try { return response.json(); } catch { return null; }
}

function verify(response, label, assertion) {
  const body = json(response);
  const passed = check(body, { [label]: () => assertion(body, response.status) });
  businessErrors.add(!passed);
  if (!passed) {
    // Failure evidence excludes tokens, credentials, names, salaries and raw response bodies.
    console.error(JSON.stringify({ check: label, status: response.status, code: body?.code, correlationId: response.headers['X-Correlation-Id'] || body?.correlationId }));
    fail(label);
  }
  return body;
}

function login(email, role, runId) {
  return verify(request('POST', '/api/auth/login', null, { email, password }, 'login', runId),
    `PERF-AUTH-001 authenticated ${role}`, (b, s) => s === 200 && b?.role === role && typeof b.token === 'string' && b.token.length > 30).token;
}

export function setupWorkforce() {
  const runId = `${Date.now()}`;
  const employee = login('employee1@example.test', 'EMPLOYEE', runId);
  const manager = login('manager@example.test', 'MANAGER', runId);
  const admin = login('admin@example.test', 'ADMIN', runId);
  const existing = verify(request('GET', '/api/payroll-runs', admin, undefined, 'setup', runId),
    'payroll fixture inventory is available', (b, s) => s === 200 && Array.isArray(b));
  const used = new Set(existing.map((run) => run.period));
  const periods = [];
  // Allocate from actual persisted data; finite iterations never recycle a period mid-run.
  for (let year = 2400; year <= 9999 && periods.length < 256; year++) {
    for (let month = 1; month <= 12 && periods.length < 256; month++) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      if (!used.has(period)) periods.push(period);
    }
  }
  if (periods.length < 256) fail('Not enough unused payroll periods; provision a fresh isolated database.');
  return { runId, employee, manager, admin, periods };
}

export function authentication(data) {
  login('employee1@example.test', 'EMPLOYEE', data.runId);
  sleep(0.5);
}

export function employeeRead(data) {
  verify(request('GET', '/api/employees', data.employee, undefined, 'employee-read', data.runId),
    'PERF-EMP-001 read preserves object authorization and employee data',
    (b, s) => s === 200 && Array.isArray(b) && b.length === 1 && b[0].id === employeeId && b[0].active === true && typeof b[0].name === 'string');
  sleep(0.15);
}

export function leaveTransactionFlow(data) {
  const before = verify(request('GET', '/api/leave-balances/me', data.employee, undefined, 'leave-balance', data.runId),
    'leave balance is available', (b, s) => s === 200 && Number.isInteger(b?.availableDays));
  const started = Date.now();
  const uniqueDay = new Date(Date.UTC(2500, 0, 1) + (Number(data.runId) % 100000 + exec.vu.idInTest * 10000 + exec.scenario.iterationInTest) * 86400000).toISOString().slice(0, 10);
  let created;
  try {
    created = verify(request('POST', '/api/leave-requests', data.employee, { startDate: uniqueDay, endDate: uniqueDay, reason: `Performance ${data.runId}` }, 'leave-create', data.runId),
      'PERF-LEAVE-001 valid leave reserves one day', (b, s) => s === 201 && b?.employeeId === employeeId && b.days === 1 && b.status === 'PENDING_MANAGER');
    verify(request('GET', `/api/leave-requests/${created.id}`, data.employee, undefined, 'leave-read', data.runId),
      'persisted leave retains date and duration', (b, s) => s === 200 && b?.startDate === uniqueDay && b.days === 1 && b.status === 'PENDING_MANAGER');
  } finally {
    // A rejected request releases its reservation, so repeated load cannot consume seed balance.
    if (created?.id) verify(request('POST', `/api/leave-requests/${created.id}/reject`, data.manager, undefined, 'leave-reject', data.runId),
      'manager rejection releases the reservation', (b, s) => s === 200 && b?.id === created.id && b.status === 'REJECTED');
  }
  verify(request('GET', '/api/leave-balances/me', data.employee, undefined, 'leave-balance', data.runId),
    'PERF-LEAVE-001 rejected leave does not decrement balance', (b, s) => s === 200 && b?.availableDays === before.availableDays);
  leaveTransaction.add(Date.now() - started);
  sleep(0.4);
}

function cents(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return NaN;
  const [whole, fractional] = value.split('.');
  return Number(whole) * 100 + Number(fractional);
}

function validPayroll(run) {
  if (!Array.isArray(run?.items) || run.items.length < 5) return false;
  const employees = new Set();
  let sum = 0;
  for (const item of run.items) {
    const base = cents(item.baseSalary), tax = cents(item.tax), deductions = cents(item.deductions), net = cents(item.netPay);
    if (!item.employeeId || employees.has(item.employeeId) || ![base, tax, deductions, net].every(Number.isSafeInteger)) return false;
    if (tax !== Math.floor((base * 20 + 50) / 100) || deductions !== Math.floor((base * 5 + 50) / 100) || net !== base - tax - deductions) return false;
    employees.add(item.employeeId);
    sum += net;
  }
  return cents(run.totalNet) === sum;
}

export function payrollFlow(data) {
  const iteration = exec.scenario.iterationInTest;
  if (iteration >= data.periods.length) fail('Payroll iteration budget exceeds allocated unique periods.');
  const period = data.periods[iteration];
  const run = verify(request('POST', '/api/payroll-runs', data.admin, { period }, 'payroll-create', data.runId),
    'PERF-PAY-001 payroll period created', (b, s) => s === 201 && b?.period === period && b.status === 'CREATED');
  const started = Date.now();
  verify(request('POST', `/api/payroll-runs/${run.id}/process`, data.admin, undefined, 'payroll-process', data.runId),
    'asynchronous payroll accepted', (b, s) => s === 202 && b?.id === run.id && ['CREATED', 'PROCESSING', 'COMPLETED'].includes(b.status));
  let completed;
  while (Date.now() - started < 10000) {
    const current = verify(request('GET', `/api/payroll-runs/${run.id}`, data.admin, undefined, 'payroll-poll', data.runId),
      'payroll poll remains an authorized healthy workflow', (b, s) => s === 200 && b?.id === run.id && ['CREATED', 'PROCESSING', 'COMPLETED'].includes(b.status));
    if (current.status === 'COMPLETED') { completed = current; break; }
    sleep(0.1);
  }
  const valid = check(completed, { 'PERF-PAY-001 completed within deadline with exact monetary invariants': (b) => Boolean(b && b.period === period && validPayroll(b)) });
  businessErrors.add(!valid);
  payrollCompletion.add(Date.now() - started);
  if (!valid) fail(`Payroll ${run.id} did not complete correctly within 10 seconds.`);
  completedPayrolls.add(1);
  verify(request('POST', `/api/payroll-runs/${run.id}/finalize`, data.admin, undefined, 'payroll-finalize', data.runId),
    'finalization preserves item identities and total', (b, s) => s === 200 && b?.status === 'FINALIZED' && b.totalNet === completed.totalNet && b.items.length === completed.items.length && b.items.every((item) => completed.items.some((old) => old.id === item.id)));
}
