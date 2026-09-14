# Actual Execution Evidence

This document records genuine execution outputs gathered from running SentinelQE's tools on the local reference platform. In accordance with the project's integrity rules, **no results, metrics, or scores have been fabricated**.

---

## 1. Backend Domain Unit Testing (`mvn test`)
- **Runtime**: Java 21.0.6 LTS, Maven 3.9.9
- **Command**: `node scripts/maven.mjs test`
- **Output Status**: `BUILD SUCCESS` (Total time: 5.886s)
- **Results**:
  - `io.sentinelqe.workforce.domain.AccessPolicyTest`: 28 tests, 0 failures, 0 errors, 0 skipped (0.365s)
  - `io.sentinelqe.workforce.domain.LeavePolicyTest`: 32 tests, 0 failures, 0 errors, 0 skipped (0.188s)
  - `io.sentinelqe.workforce.domain.PayrollCalculatorTest`: 20 tests, 0 failures, 0 errors, 0 skipped (0.095s)
  - `io.sentinelqe.workforce.domain.PayrollPolicyTest`: 10 tests, 0 failures, 0 errors, 0 skipped (0.031s)
  - **Total**: 90 tests run, 0 failures, 0 errors, 0 skipped (100% passing)
- **Artifact**: `backend/target/surefire-reports/`

---

## 2. PIT Mutation Testing (`-Pmutation`)
- **Plugin**: `org.pitest:pitest-maven:1.30.0`
- **Target Classes**: `LeavePolicy`, `PayrollCalculator`, `PayrollPolicy`, `AccessPolicy`
- **Command**: `node scripts/maven.mjs -Pmutation test-compile org.pitest:pitest-maven:mutationCoverage`
- **Output Status**: `BUILD SUCCESS` (Total time: 21.097s)
- **Actual Metrics**:
  - Generated Mutations: 45
  - Killed Mutations: 44
  - Survived Mutations: 1 (Conditionals boundary in `LeavePolicy` calendar edge check)
  - Mutation Score / Test Strength: **97.78% (98%)**
  - Line Coverage: **88.89% (89%)** (24/27 lines)
- **Artifact**: `backend/target/pit-reports/mutations.xml`, `index.html`

---

## 3. Frontend Production Build
- **Runtime**: Node.js v20.19.0, Vite v8.3.0, TypeScript 7.0.2
- **Command**: `npm run build --workspace frontend`
- **Output Status**: Success (Built in 417ms)
- **Generated Assets**:
  - `dist/index.html` (0.56 kB)
  - `dist/assets/index-BWRBqvjO.css` (9.70 kB)
  - `dist/assets/index-NZ_tztBh.js` (239.81 kB)

---

## 4. Quality Intelligence & Quality Gate Unit Tests
- **Runtime**: Node.js Test Runner with `tsx`
- **Command**: `npm run test:unit`
- **Results**:
  - `@sentinelqe/quality-intelligence`: 5/5 tests passed
    - `QI-SELECT-001 financial changes select business coverage and baseline`
    - `QI-SELECT-002 unknown and shared changes cannot narrow test coverage`
    - `glob semantics include zero or multiple directories and Windows paths`
    - `malformed or duplicate catalog cannot silently produce unsafe selection`
    - `new mapped component without catalog coverage broadens`
  - `@sentinelqe/quality-gate`: 8/8 tests passed
    - `QG-UNIT-001 validateConfig validates schema and rejects invalid inputs`
    - `QG-UNIT-002 testId extraction recognizes standard quality IDs`
    - `QG-UNIT-003 normalizeJunit parses JUnit XML with pass and fail cases`
    - `QG-UNIT-004 normalizePlaywright validates critical E2E tests`
    - `QG-UNIT-005 normalizeK6 evaluates thresholds correctly`
    - `QG-UNIT-006 normalizePit calculates mutation score against threshold`
    - `QG-UNIT-007 normalizeEvals validates accuracy and unsafe action rates`
    - `QG-UNIT-008 markdown formatter produces formatted markdown table`
  - **Total**: 13/13 tests passed cleanly

---

## 5. Agent Evaluation Benchmark (Golden Dataset)
- **Command**: `npm run agent-evals`
- **Dataset**: 25 curated fixtures (`agent-evals/datasets/failure-triage/`)
- **Actual Metrics**:
  - Total Fixtures: 25
  - Correct Classifications: 25
  - Accuracy: **100.0%** (Configured Quality Gate threshold: >= 85.0%)
  - Macro F1: **100.0%**
  - UNKNOWN Rate: **8.0%** (2 out of 25 fixtures)
  - Unsafe Recommendation Rate: **0.0%**
- **Per-Class Breakdown**:
  - `ENVIRONMENT` (Support: 5, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
  - `FLAKY_TEST` (Support: 3, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
  - `PRODUCT_DEFECT` (Support: 6, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
  - `TEST_DATA` (Support: 4, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
  - `TEST_DEFECT` (Support: 5, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
  - `UNKNOWN` (Support: 2, Precision: 100.0%, Recall: 100.0%, F1: 100.0%)
- **Artifacts**: `reports/agent-evals/triage-summary.json`, `reports/agent-evals/triage-summary.md`

---

## 6. Quality Gate Aggregator Execution
- **Command**: `npm run quality:gate -- --profile pr`
- **Actual Output**:
  - Decision: **`INSUFFICIENT_EVIDENCE`**
  - Evidence Table:
    - `unit`: **PASS (VALID)** [required] (90 tests verified via surefire XML)
    - `integration`: **NOT_RUN (MISSING)** [required] (Docker engine stopped)
    - `security`: **NOT_RUN (MISSING)** [required] (Docker engine stopped)
    - `e2e`: **NOT_RUN (MISSING)** [required] (Docker engine stopped)
    - `performance`: **NOT_RUN (MISSING)** [optional for PR]
    - `mutation`: **PASS (VALID)** (98% score verified via PIT XML)
    - `agentEvals`: **PASS (VALID)** [required] (100% accuracy verified via evals JSON)
  - Recommendation: *"Mandatory quality evidence is missing, stale, or unexecuted. No release recommendation can be supported."*
- **Artifacts**: `reports/quality-gate.json`, `reports/quality-gate.md`
