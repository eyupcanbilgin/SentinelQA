# Verified Execution Evidence (V2 Hardened Platform)

This document records authentic execution outputs gathered from running SentinelQA's tools on the reference platform. In accordance with the project's integrity rules, **no results, metrics, or scores have been fabricated**.

---

## 1. Quality Catalog Verification & Drift Detection
- **Command**: `npm run catalog:verify`
- **Output Status**: Clean Pass (`0 drift`)
- **Verified Metrics**:
  - Total Catalog Tests: **54**
  - Missing Executable Tests: **0**
  - Stale Catalog Entries: **0**
  - Unmapped Requirements: **0**
- **Significance**: Prevents portfolio metadata from diverging from actual runnable test code.

---

## 2. Test Selection & Change-Impact Benchmark
- **Command**: `npm run quality:benchmark-selection`
- **Benchmark Suite**: 10 simulated PR cases (`quality-intelligence/benchmarks/change-impact/cases.json`)
- **Output Status**: Clean Pass
- **Actual Metrics**:
  - Total Simulated Cases: 10
  - **Critical False Negatives: 0** (Target: 0)
  - **Critical Recall Rate: 100.0%**
  - **Targeted Suite Reduction: 75.9%** (across low-risk and targeted changes)
  - Broadening Rate: 40.0% (unmapped, test-infra, and core changes broaden safely)
- **Artifacts**: `reports/change-impact/benchmark.json`, `benchmark.md`

---

## 3. Guarded Healer & Patch Safety Guardrails
- **Command**: `npm run quality:benchmark-healer`
- **Benchmark Suite**: 8 patch proposals testing safety constraints
- **Output Status**: Clean Pass
- **Actual Metrics**:
  - **Unsafe Patches Accepted: 0** (Target: 0)
  - Unsafe Rejection Rate: **100%**
  - Safe Acceptance Rate: **100%**
- **Rejection Types Verified**:
  - Assertion weakening (e.g. `toBe(x)` $\to$ `toBeDefined()`)
  - Test skipping injection (`.skip`, `@Disabled`)
  - Net assertion deletions
  - Production code edits
  - Timeout inflation (>10s)
  - Exception suppression with empty catch blocks
- **Artifacts**: `reports/healer-benchmark/benchmark.json`, `benchmark.md`

---

## 4. Backend Domain Unit Testing
- **Runtime**: Java 21 LTS, Maven 3.9.9
- **Command**: `npm run test:backend`
- **Output Status**: `BUILD SUCCESS` (Total time: 4.288s)
- **Results**:
  - `AccessPolicyTest`: 28 tests, 0 failures, 0 errors, 0 skipped
  - `LeavePolicyTest`: 32 tests, 0 failures, 0 errors, 0 skipped
  - `PayrollCalculatorTest`: 20 tests, 0 failures, 0 errors, 0 skipped
  - `PayrollPolicyTest`: 10 tests, 0 failures, 0 errors, 0 skipped
  - **Total**: 90 tests run, 0 failures, 0 errors, 0 skipped (100% passing)
- **Artifact**: `backend/target/surefire-reports/`

---

## 5. PostgreSQL Integration & Security Testing (Testcontainers)
- **Runtime**: Java 21 LTS, Testcontainers 1.20.4, PostgreSQL 17.11 Alpine
- **Command**: `npm run test:integration`
- **Output Status**: `BUILD SUCCESS` (Total time: 22.776s)
- **Results**:
  - `AuthApiIT`: 8 tests, 0 failures (`SEC-AUTHZ-001`, `002`, `003`, `004` verified)
  - `LeaveApiIT`: 8 tests, 0 failures (multi-stage leave workflow, balance checks)
  - `LeaveConcurrencyIT`: 3 tests, 0 failures (pessimistic row locking against race conditions)
  - `PayrollApiIT`: 6 tests, 0 failures (asynchronous queue polling, finalization lock)
  - **Total**: 25 tests run, 0 failures, 0 errors, 0 skipped (100% passing)
- **Artifact**: `backend/target/failsafe-reports/`

---

## 6. Playwright Critical User Journeys (E2E)
- **Runtime**: Playwright 1.63.0, Chromium Headless Shell 153.0.8010.12
- **Command**: `npm run test:e2e`
- **Live Stack Target**: `http://localhost:3000` (backed by Spring Boot container on `:8080`)
- **Output Status**: Clean Pass (Total time: 8.2s)
- **Results**:
  - `E2E-LEAVE-001`: Employee request $\to$ Manager advance $\to$ HR approval debits balance exactly once (Passed: 2.8s)
  - `E2E-PAY-001`: Admin creates period $\to$ async processing completed $\to$ monetary invariants verified $\to$ finalization locks run (Passed: 3.1s)
  - **Total**: 2 passed (100%)
- **Artifacts**: `reports/playwright/results.json`, `reports/playwright/junit.xml`, HTML report

---

## 7. Performance Smoke Scenario (Containerized k6)
- **Runtime**: `grafana/k6:0.57.0` executed via Docker Compose
- **Command**: `npm run perf:smoke`
- **Output Status**: Clean Pass (Total time: 2.4s)
- **Actual Metrics**:
  - Total HTTP Requests: **46** (19.4 req/s)
  - HTTP Request Failed Rate: **0.00%** (threshold: `< 1%`)
  - HTTP Request Duration p(95): **253.8ms** (threshold: `< 750ms`)
  - Employee Read p(95): **5.3ms** (threshold: `< 800ms`)
  - Auth Login p(95): **265.5ms** (threshold: `< 1000ms`)
  - Business Invariant Checks: **48 / 48 (100.0%)**
  - Thresholds Evaluated: **8 / 8 passed**
- **Artifact**: `reports/k6/summary.json`

---

## 8. Agent Evaluations: Rule Baseline vs LLM Holdout
- **Command**: `npm run agent-evals:compare`
- **Development Dataset (25 cases)**:
  - Accuracy: **100.0%**
  - Unsafe Recommendation Rate: **0.0%**
- **Independent Holdout Benchmark (15 cases)**:
  - Rule Baseline Accuracy: **66.7%**
  - Macro F1: **60.7%**
  - Abstention Rate (`UNKNOWN`): **33.3%**
  - High-Confidence Errors: **2**
  - Unsafe Action Rate: **0.0%**
  - Prompt Injection Defense (`case-012`): **Passed** (refused injected override)
- **Real LLM Benchmark**:
  - Labeled `OPTIONAL_KEY_ABSENT` when `OPENAI_API_KEY` is not provided, avoiding silent substitution.
- **Artifacts**: `reports/agent-evals/triage-summary.json`, `reports/agent-evals/benchmark-comparison.md`

---

## 9. PIT Mutation Testing
- **Plugin**: `org.pitest:pitest-maven:1.30.0`
- **Command**: `npm run mutation`
- **Target Classes**: `LeavePolicy`, `PayrollCalculator`, `PayrollPolicy`, `AccessPolicy`
- **Actual Metrics**:
  - Total Mutations Emitted: 45
  - Mutations Killed: 44
  - Survived Mutations: 1 (Conditionals boundary in `LeavePolicy` calendar check)
  - **Mutation Score / Test Strength: 97.8% (44/45)**
- **Artifact**: `backend/target/pit-reports/mutations.xml`

---

## 10. Quality Gate Evaluation & Manifest Binding
- **Command**: `npm run quality:start-run && npm run quality:gate -- --profile pr`
- **Output Status**: `WARN (pr)` (Exit code: 0)
- **Verified Sources**:
  - `unit`: **PASS (VALID)** [required] (90 tests)
  - `integration`: **PASS (VALID)** [required] (25 tests)
  - `security`: **PASS (VALID)** [required] (4 critical IDs observed)
  - `e2e`: **PASS (VALID)** [required] (2 critical journeys passed)
  - `performance`: **PASS (VALID)** [optional for PR] (46 requests, 0 failures)
  - `mutation`: **NOT_RUN (STALE)** [optional for PR] (stale from previous execution)
  - `agentEvals`: **PASS (VALID)** [required] (25 fixtures, 100% accuracy)
- **Nightly Profile Evaluation**:
  - `npm run quality:gate -- --profile nightly`
  - Output Status: **`INSUFFICIENT_EVIDENCE (nightly)`** (Exit code: 1)
  - Reason: `mutation` is required for Nightly profile, and stale evidence blocks promotion.
- **Artifacts**: `reports/run-manifest.json`, `reports/quality-gate.json`, `reports/quality-gate.md`
