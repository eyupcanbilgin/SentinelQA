import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('agent-evals/datasets/failure-triage');
await mkdir(outDir, { recursive: true });

const fixtures = [
  // --- PRODUCT_DEFECT ---
  {
    id: 'FT-001',
    notes: 'Double finalization regression in payroll service',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'payroll',
    evidence: {
      testId: 'API-PAY-005',
      testName: 'API-PAY-005 reject double finalize',
      layer: 'api',
      component: 'payroll',
      httpStatus: 500,
      errorMessage: 'Expected HTTP 409 but received HTTP 500 with DomainException: Business invariant violated: Payroll run has already been finalized',
      stackTrace: 'io.sentinelqe.workforce.common.DomainException: Payroll run has already been finalized\n  at io.sentinelqe.workforce.payroll.PayrollService.finalize(PayrollService.java:112)',
      backendLogs: ['[ERROR] POST /api/payroll-runs/2030-05/finalize - DomainException: double finalize invariant broken'],
      correlationId: 'req-corr-pay-005'
    }
  },
  {
    id: 'FT-002',
    notes: 'Tax calculation rounding error producing cent discrepancy',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'payroll',
    evidence: {
      testId: 'UNIT-PAY-001',
      testName: 'UNIT-PAY-001 verify deterministic tax and deduction calculation',
      layer: 'unit',
      component: 'payroll',
      errorMessage: 'AssertionError: tax calculation discrepancy. Expected: <246.91> but was: <246.92>',
      stackTrace: 'java.lang.AssertionError: tax calculation discrepancy\n  at io.sentinelqe.workforce.domain.PayrollCalculatorTest.calculatesDocumentedPayrollAmounts',
      backendLogs: ['[WARN] Tax calculation discrepancy in payroll item generation for salary 1234.56']
    }
  },
  {
    id: 'FT-003',
    notes: 'Leave balance underflow without reservation lock',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'leave',
    evidence: {
      testId: 'INT-LEAVE-003',
      testName: 'INT-LEAVE-003 concurrent requests cannot overspend leave balance',
      layer: 'integration',
      component: 'leave',
      httpStatus: 500,
      errorMessage: 'DomainException: leave balance underflow. Balance fell below zero: -2 days',
      stackTrace: 'io.sentinelqe.workforce.common.DomainException: leave balance underflow\n  at io.sentinelqe.workforce.leave.LeaveService.approve(LeaveService.java:84)',
      correlationId: 'req-leave-underflow-1'
    }
  },
  {
    id: 'FT-004',
    notes: 'NullPointerException when manager reference is unassigned',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'employee',
    evidence: {
      testId: 'API-EMP-002',
      testName: 'API-EMP-002 employee detail view with null manager',
      layer: 'api',
      component: 'employee',
      httpStatus: 500,
      errorMessage: 'Internal Server Error: NullPointerException in EmployeeController.java:45',
      stackTrace: 'java.lang.NullPointerException: Cannot invoke Employee.getId() because manager is null\n  at io.sentinelqe.workforce.employee.EmployeeController.get(EmployeeController.java:45)',
      backendLogs: ['[ERROR] Unhandled NullPointerException in EmployeeController'],
      correlationId: 'req-emp-null-mgr'
    }
  },
  {
    id: 'FT-005',
    notes: 'Object authorization leak allowing employee to read peers salary',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'auth',
    evidence: {
      testId: 'SEC-AUTHZ-001',
      testName: 'SEC-AUTHZ-001 employee cannot access another employee restricted data',
      layer: 'security',
      component: 'auth',
      httpStatus: 500,
      errorMessage: 'Expected HTTP 403 Forbidden but received HTTP 500 status code: 500 with DomainException',
      backendLogs: ['[ERROR] Unhandled security policy violation when employee-1 accessed employee-2'],
      correlationId: 'sec-breach-001'
    }
  },
  {
    id: 'FT-006',
    notes: 'Manager approval bypass seed activated',
    expectedClassification: 'PRODUCT_DEFECT',
    expectedComponent: 'leave',
    evidence: {
      testId: 'API-LEAVE-004',
      testName: 'API-LEAVE-004 manager cannot approve unrelated employee',
      layer: 'api',
      component: 'leave',
      httpStatus: 500,
      errorMessage: 'IllegalStateException: finalized payroll or leave rule failed: business invariant violated in manager check',
      backendLogs: ['[ERROR] Leave request approved despite manager not managing employee: business invariant violated']
    }
  },

  // --- TEST_DEFECT ---
  {
    id: 'FT-007',
    notes: 'Playwright locator failed due to changed UI button label',
    expectedClassification: 'TEST_DEFECT',
    expectedComponent: 'frontend-tests',
    evidence: {
      testId: 'E2E-LEAVE-001',
      testName: 'E2E-LEAVE-001 employee creates leave request',
      layer: 'e2e',
      component: 'frontend-tests',
      errorMessage: 'locator.click: Timeout 5000ms exceeded while waiting for selector "button.btn-legacy-submit"',
      stackTrace: 'Error: locator.click: Timeout 5000ms exceeded.\n  at authenticatedEmployeePage (tests/e2e/fixtures/workforce.ts:45)',
      screenshotPath: 'artifacts/failures/run-12/E2E-LEAVE-001/screenshot.png',
      consoleLogs: ['[INFO] DOM rendered successfully with role button "Submit Request"']
    }
  },
  {
    id: 'FT-008',
    notes: 'Strict mode violation: two buttons match non-unique selector',
    expectedClassification: 'TEST_DEFECT',
    expectedComponent: 'frontend-tests',
    evidence: {
      testId: 'E2E-PAY-001',
      testName: 'E2E-PAY-001 admin finalizes payroll',
      layer: 'e2e',
      component: 'frontend-tests',
      errorMessage: 'Error: strict mode violation: locator("button:has-text(\'Approve\')") resolved to 2 elements',
      stackTrace: 'Error: strict mode violation in payroll.spec.ts:34',
      screenshotPath: 'artifacts/failures/run-14/E2E-PAY-001/screenshot.png'
    }
  },
  {
    id: 'FT-009',
    notes: 'Assertion expecting string instead of integer in JSON schema',
    expectedClassification: 'TEST_DEFECT',
    expectedComponent: 'api-tests',
    evidence: {
      testId: 'API-AUTH-002',
      testName: 'API-AUTH-002 token expiration response structure',
      layer: 'api',
      component: 'api-tests',
      httpStatus: 200,
      errorMessage: 'AssertionError: expected: <"3600"> but was: <3600>. Type mismatch between String and Integer.',
      stackTrace: 'java.lang.AssertionError: expected: <"3600"> but was: <3600>\n  at io.sentinelqe.workforce.AuthApiIT.verifyTokenExpiry(AuthApiIT.java:42)'
    }
  },
  {
    id: 'FT-010',
    notes: 'Assertion expecting stale legacy error message string',
    expectedClassification: 'TEST_DEFECT',
    expectedComponent: 'api-tests',
    evidence: {
      testId: 'API-EMP-003',
      testName: 'API-EMP-003 invalid email format validation',
      layer: 'api',
      component: 'api-tests',
      httpStatus: 400,
      errorMessage: 'AssertionError: expect(received).to equal "Email is malformed". Received "must be a well-formed email address"',
      stackTrace: 'AssertionError: expect(received).to equal\n  at EmployeeApiIT.java:88'
    }
  },
  {
    id: 'FT-011',
    notes: 'Playwright modal overlay closed unexpectedly before click',
    expectedClassification: 'TEST_DEFECT',
    expectedComponent: 'frontend-tests',
    evidence: {
      testId: 'E2E-LEAVE-002',
      testName: 'E2E-LEAVE-002 manager approves direct report request',
      layer: 'e2e',
      component: 'frontend-tests',
      errorMessage: 'locator.click: target closed while waiting for element "dialog >> button.confirm"',
      stackTrace: 'Error: locator.click: target closed\n  at tests/e2e/specs/leave.spec.ts:77'
    }
  },

  // --- ENVIRONMENT ---
  {
    id: 'FT-012',
    notes: 'PostgreSQL connection refused on port 5432',
    expectedClassification: 'ENVIRONMENT',
    expectedComponent: 'infrastructure',
    evidence: {
      testId: 'INT-PAY-001',
      testName: 'INT-PAY-001 payroll database persistence',
      layer: 'integration',
      component: 'infrastructure',
      errorMessage: 'org.postgresql.util.PSQLException: Connection to localhost:5432 refused. Check that hostname and port are correct and postmaster is accepting TCP/IP connections.',
      stackTrace: 'org.postgresql.util.PSQLException: Connection refused\n  at org.postgresql.core.v3.ConnectionFactoryImpl.openConnectionImpl',
      backendLogs: ['[ERROR] HikariPool-1 - Exception during pool initialization: connection refused']
    }
  },
  {
    id: 'FT-013',
    notes: 'Nginx reverse proxy returned 502 Bad Gateway',
    expectedClassification: 'ENVIRONMENT',
    expectedComponent: 'infrastructure',
    evidence: {
      testId: 'E2E-SMOKE-001',
      testName: 'E2E-SMOKE-001 frontend loads workforce dashboard',
      layer: 'e2e',
      component: 'infrastructure',
      httpStatus: 502,
      errorMessage: 'Navigation failed: received HTTP 502 Bad Gateway from reverse proxy',
      networkLogs: ['GET /api/health -> 502 Bad Gateway'],
      backendLogs: ['[nginx] 2026/09/14 connect() failed (111: Connection refused) while connecting to upstream']
    }
  },
  {
    id: 'FT-014',
    notes: 'Docker container killed by OOM killer',
    expectedClassification: 'ENVIRONMENT',
    expectedComponent: 'infrastructure',
    evidence: {
      testId: 'INT-POSTGRES-001',
      testName: 'INT-POSTGRES-001 flyway migration execution',
      layer: 'integration',
      component: 'infrastructure',
      errorMessage: 'TestcontainersException: Container docker.io/postgres:16-alpine died with exit code 137 (OOMKilled)',
      backendLogs: ['[ERROR] docker engine terminated container: Out of Memory (host unreachable)']
    }
  },
  {
    id: 'FT-015',
    notes: 'PostgreSQL database connection timed out during heavy query',
    expectedClassification: 'ENVIRONMENT',
    expectedComponent: 'infrastructure',
    evidence: {
      testId: 'PERF-PAY-001',
      testName: 'PERF-PAY-001 asynchronous payroll processing load',
      layer: 'performance',
      component: 'infrastructure',
      httpStatus: 504,
      errorMessage: 'java.sql.SQLTransientConnectionException: connection timed out waiting for postgres pool connection',
      backendLogs: ['[WARN] HikariPool connection timed out. port 5432 is congested or host unreachable']
    }
  },
  {
    id: 'FT-016',
    notes: 'Service unavailable due to upstream DNS lookup error',
    expectedClassification: 'ENVIRONMENT',
    expectedComponent: 'infrastructure',
    evidence: {
      testId: 'API-HEALTH-001',
      testName: 'API-HEALTH-001 health check probe',
      layer: 'api',
      component: 'infrastructure',
      httpStatus: 503,
      errorMessage: 'FetchError: request to http://backend:8080/actuator/health failed, reason: getaddrinfo ENOTFOUND backend (service unavailable)',
      networkLogs: ['GET http://backend:8080/actuator/health -> ENOTFOUND']
    }
  },

  // --- TEST_DATA ---
  {
    id: 'FT-017',
    notes: 'Unique constraint collision on employee email due to missing uuid suffix',
    expectedClassification: 'TEST_DATA',
    expectedComponent: 'database',
    evidence: {
      testId: 'API-EMP-001',
      testName: 'API-EMP-001 create employee duplicate email fixture',
      layer: 'api',
      component: 'database',
      httpStatus: 409,
      errorMessage: 'DataIntegrityViolationException: ERROR: duplicate key value violates unique constraint "idx_users_email". Key (email)=(employee1@example.test) already exists.',
      stackTrace: 'org.springframework.dao.DataIntegrityViolationException: duplicate key value violates unique constraint\n  at org.hibernate.engine.jdbc.spi.SqlExceptionHelper.convert',
      backendLogs: ['[ERROR] SQL Error: 0, SQLState: 23505 duplicate key value violates unique constraint']
    }
  },
  {
    id: 'FT-018',
    notes: 'Foreign key failure when inserting employee with nonexistent department',
    expectedClassification: 'TEST_DATA',
    expectedComponent: 'database',
    evidence: {
      testId: 'INT-EMP-002',
      testName: 'INT-EMP-002 persist employee with department',
      layer: 'integration',
      component: 'database',
      errorMessage: 'org.postgresql.util.PSQLException: ERROR: insert or update on table "employees" violates foreign key constraint "fk_employees_department". Key (department_id)=(999999) is not present in table "departments".',
      stackTrace: 'org.postgresql.util.PSQLException: violates foreign key constraint fk_employees_department',
      backendLogs: ['[ERROR] Foreign key constraint violated due to pre-existing test data removal']
    }
  },
  {
    id: 'FT-019',
    notes: 'Missing seed entity: employee record not found for test',
    expectedClassification: 'TEST_DATA',
    expectedComponent: 'database',
    evidence: {
      testId: 'API-LEAVE-001',
      testName: 'API-LEAVE-001 create valid leave request',
      layer: 'api',
      component: 'database',
      httpStatus: 404,
      errorMessage: 'EntityNotFoundException: Employee with id e0000000-0000-0000-0000-000000000099 not found. Missing seed data.',
      stackTrace: 'jakarta.persistence.EntityNotFoundException: Employee not found\n  at io.sentinelqe.workforce.employee.EmployeeRepository.getReferenceById',
      backendLogs: ['[WARN] Test query failed: stale data entity not found']
    }
  },
  {
    id: 'FT-020',
    notes: 'Unique constraint collision on duplicate payroll period',
    expectedClassification: 'TEST_DATA',
    expectedComponent: 'database',
    evidence: {
      testId: 'API-PAY-002',
      testName: 'API-PAY-002 reject duplicate payroll period',
      layer: 'api',
      component: 'database',
      httpStatus: 409,
      errorMessage: 'DataIntegrityViolationException: duplicate key value violates unique constraint "idx_payroll_runs_period". Period "2026-09" already created by prior test run.',
      stackTrace: 'org.springframework.dao.DataIntegrityViolationException: duplicate key value violates unique constraint\n  at PayrollRunRepository.save',
      backendLogs: ['[ERROR] Pre-existing test data collision for period 2026-09: seed conflict']
    }
  },

  // --- FLAKY_TEST ---
  {
    id: 'FT-021',
    notes: 'Playwright test failed on first attempt due to transition animation, passed on retry',
    expectedClassification: 'FLAKY_TEST',
    expectedComponent: 'frontend-tests',
    evidence: {
      testId: 'E2E-LEAVE-003',
      testName: 'E2E-LEAVE-003 HR completes approval and verifies balance transition',
      layer: 'e2e',
      component: 'frontend-tests',
      errorMessage: 'locator.click: Element is not visible after 2000ms animation frame',
      retryHistory: {
        attemptCount: 2,
        passedOnRetry: true,
        intermittent: true
      },
      consoleLogs: ['[INFO] Retry attempt 2 passed without error']
    }
  },
  {
    id: 'FT-022',
    notes: 'Race condition in concurrent asynchronous notification assertion',
    expectedClassification: 'FLAKY_TEST',
    expectedComponent: 'payroll',
    evidence: {
      testId: 'INT-PAY-004',
      testName: 'INT-PAY-004 asynchronous payroll job completion notification',
      layer: 'integration',
      component: 'payroll',
      errorMessage: 'AssertionError: expected payroll status to be COMPLETED within 100ms, but was still PROCESSING',
      retryHistory: {
        attemptCount: 3,
        passedOnRetry: true,
        intermittent: true
      },
      backendLogs: ['[INFO] Processing completed at 104ms']
    }
  },
  {
    id: 'FT-023',
    notes: 'Intermittent failure in WebSocket status stream connection',
    expectedClassification: 'FLAKY_TEST',
    expectedComponent: 'frontend-tests',
    evidence: {
      testId: 'E2E-PAY-002',
      testName: 'E2E-PAY-002 live status indicator update during processing',
      layer: 'e2e',
      component: 'frontend-tests',
      errorMessage: 'AssertionError: Expected status tag "PROCESSING" but was disconnected',
      retryHistory: {
        attemptCount: 2,
        passedOnRetry: true,
        intermittent: true
      }
    }
  },

  // --- UNKNOWN ---
  {
    id: 'FT-024',
    notes: 'Truncated logs with no stack trace or error message',
    expectedClassification: 'UNKNOWN',
    expectedComponent: 'unknown',
    evidence: {
      testId: 'SYS-GEN-001',
      testName: 'SYS-GEN-001 generic system heartbeat probe',
      layer: 'quality',
      component: 'unknown',
      errorMessage: 'Ambiguous failure: process exited with status 13',
      backendLogs: ['[DEBUG] heartbeat ticked', '[INFO] shutting down worker']
    }
  },
  {
    id: 'FT-025',
    notes: 'Contradictory and incomplete log dump without HTTP code or exception',
    expectedClassification: 'UNKNOWN',
    expectedComponent: 'unknown',
    evidence: {
      testId: 'SYS-GEN-002',
      testName: 'SYS-GEN-002 telemetry dispatch',
      layer: 'quality',
      component: 'unknown',
      errorMessage: 'Ambiguous failure: pipeline canceled by operator without diagnostic payload',
      backendLogs: ['[INFO] telemetry buffer flushed 0 entries']
    }
  }
];

for (const f of fixtures) {
  const file = path.join(outDir, `${f.id.toLowerCase()}-${f.expectedClassification.toLowerCase().replace(/_/g, '-')}.json`);
  await writeFile(file, JSON.stringify(f, null, 2));
}

console.log(`Generated ${fixtures.length} fixtures in ${outDir}`);
