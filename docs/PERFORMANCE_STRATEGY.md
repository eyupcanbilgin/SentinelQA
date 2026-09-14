# Performance Strategy

SentinelQE treats performance as an empirical engineering discipline rather than arbitrary high-VU load tests. This document defines the workload model, service level indicators (SLIs), thresholds, and execution strategy for WorkforceOps.

## Objectives
1. Verify system responsiveness and stability under realistic traffic distributions.
2. Characterize transactional leave contention and asynchronous database-backed payroll queue completion.
3. Prevent performance regressions from slipping through release quality gates.
4. Establish clear distinctions between local reference environment observations and production capacity claims.

## Architecture and System Under Test (SUT)
- **Application**: Modular Spring Boot monolith running on JVM (Java 21 LTS).
- **Persistence**: PostgreSQL relational database with Flyway migrations.
- **Protocol**: HTTP/1.1 JSON REST APIs.
- **Asynchronous Execution**: Polled database queue with `SKIP LOCKED` worker concurrency for payroll calculation.

## Workload Model
Real HR SaaS platforms exhibit asymmetric traffic:
1. **Read-Heavy Inquiries (60-70%)**: Directory search, employee profile viewing, department hierarchies.
2. **Transactional Writes (20-25%)**: Leave request submission, managerial approval, balance decrements requiring row-level pessimistic locks.
3. **Expensive Asynchronous Batches (5-10%)**: End-of-period payroll calculation with tax computation, monetary rounding, and immutable ledger generation.

## Test Types and Scenarios

| Test Scenario | Tool / File | VUs / Target | Duration | Goal | Execution Model |
| --- | --- | --- | --- | --- | --- |
| **Performance Smoke** | `performance/smoke.js` | 1 VU | ~30s | Verify all critical endpoints respond under minimal protocol load without syntax or connectivity issues | PR gate / Local smoke |
| **Performance Baseline** | `performance/baseline.js` | 10-20 VUs | 5m | Measure steady-state latency percentiles, queue drain duration, and resource utilization | Nightly CI |
| **Performance Stress** | `performance/stress.js` | Up to 50 VUs | 5m | Push concurrency to identify resource saturation, connection pool exhaustion, and lock contention | Pre-Release / Ad-hoc |

## Service Level Indicators (SLIs) and Thresholds

| Metric | Target / Threshold | Rationale |
| --- | --- | --- |
| `http_req_failed` | `< 0.01` (< 1%) | Zero tolerance for 5xx server errors or connection resets |
| `http_req_duration{operation:employee-read}` | `p(95) < 800ms` | Fast interactive reads for end-users |
| `http_req_duration{operation:login}` | `p(95) < 1000ms` | Includes cryptographic password hashing (Argon2 / BCrypt) |
| `leave_transaction_ms` | `p(95) < 1500ms` | Pessimistic locking of employee balance row |
| `payroll_completion_ms` | `p(95) < 2500ms` (local) | Asynchronous queue pick-up, tax calculation, and batch insert |
| `business_errors` | `rate == 0` | Functional and invariant checks must hold under load |

## Correlation and Observability Under Load
Every k6 virtual user request emits an `X-Correlation-ID` header formatted as:
`perf-<runId>-<VU>-<sequence>-<operation>`
When a threshold or assertion fails, the failure bundle captures the correlation ID, enabling engineers to jump directly to OpenTelemetry traces or backend logs for root-cause diagnosis.

## Interpretation Caveat: Local vs Production
> [!IMPORTANT]
> Metrics gathered in local developer machines or GitHub Actions shared runners reflect local resource limits (CPU throttling, shared container engines) and should NOT be construed as production capacity claims. Benchmarks serve as relative regression indicators.
