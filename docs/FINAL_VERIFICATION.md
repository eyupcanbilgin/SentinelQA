# SentinelQE Final Verification Matrix

This matrix documents the actual verification outcomes executed on the reference platform. In adherence to the strict integrity policy of SentinelQE, unexecuted commands or commands blocked by missing local engine dependencies are explicitly marked as **`NOT VERIFIED`** with documented reasons.

---

## Verification Table

| Test Layer / Verification Target | Exact Command Executed | Status | Real Output / Notes | Known Environment Limitations |
| --- | --- | --- | --- | --- |
| **Backend Compilation** | `node scripts/maven.mjs test-compile` | **PASS** | 42 main source files, 9 test source files compiled without error. | None. Java 21 LTS active. |
| **Backend Unit Tests** | `node scripts/maven.mjs test` | **PASS** | 90 tests run, 0 failures, 0 errors. Total time: 5.886s. | None. Pure domain tests isolated from DB. |
| **Frontend Production Build** | `npm run build --workspace frontend` | **PASS** | `tsc --noEmit && vite build` completed in 417ms. Assets generated. | None. Node 20.19.0 active. |
| **Quality Intelligence Tests** | `npm run test --workspace quality-intelligence` | **PASS** | 5/5 tests passing in 2.7s. Validates risk scoring, broadening fallback. | None. |
| **Quality Gate Unit Tests** | `npm run test --workspace quality-gate` | **PASS** | 8/8 tests passing in 2.4s. Validates normalization, thresholds, staleness. | None. |
| **PIT Mutation Testing** | `npm run mutation` | **PASS** | 45 mutations, 44 killed (98% test strength). Line coverage: 89%. Elapsed: 21s. | None. Runs against domain classes. |
| **Agent Evaluation Benchmark** | `npm run agent-evals` | **PASS** | 25 fixtures evaluated. 100% accuracy, 100% macro F1, 8% UNKNOWN rate. | Deterministic mock baseline (real LLM optional). |
| **Change Risk & Test Selector** | `npm run quality:select-tests` | **PASS** | Correctly detects changed paths, applies mapping, triggers broadening. | None. |
| **Failure Triage CLI** | `npm run quality:triage -- <evidence>` | **PASS** | Classifies failure evidence with structured schema & confidence score. | None. |
| **Flaky Test Analyzer** | `npm run quality:flaky` | **PASS** | Classifies retry passes and intermittent failure frequencies. | None. |
| **Guarded Test Healer CLI** | `npx tsx quality-intelligence/src/guarded-healer/cli.ts` | **PASS** | Enforces anti-patterns (no assertion weakening, no skip), generates diff. | Produces patch proposals; never auto-commits. |
| **Quality Gate Aggregator (PR)** | `npm run quality:gate -- --profile pr` | **PASS (EVALUATED)** | Evaluated gate: unit=PASS, mutation=PASS, agentEvals=PASS, missing=NOT_RUN. Output: INSUFFICIENT_EVIDENCE. | Correctly prevents premature release when required reports missing. |
| **PostgreSQL Integration Tests** | `node scripts/maven.mjs -Pintegration verify` | **NOT VERIFIED** | Testcontainers requires a running Docker daemon. | Docker Desktop Linux engine was stopped during inspection. |
| **REST Assured API Tests** | `node scripts/maven.mjs -Pintegration verify` | **NOT VERIFIED** | Requires live PostgreSQL container via Testcontainers. | Docker engine unavailable. |
| **Playwright E2E Tests** | `npm run test:e2e` | **NOT VERIFIED** | Requires running backend and PostgreSQL services. | Docker engine unavailable. |
| **k6 Performance Scenarios** | `npm run test:performance-smoke` | **NOT VERIFIED** | k6 binary is not installed on PATH; requires running backend target. | k6 CLI not pre-installed on host machine. |
| **Docker Compose Stack** | `docker compose up -d` | **NOT VERIFIED** | Docker engine pipe connection failed (`dockerDesktopLinuxEngine`). | Docker Desktop application stopped. |

---

## Summary of Completed Implementations
1. **Full Domain Monolith**: Java 21 Spring Boot backend with authentication (JWT), employees, departments, leave transactions (pessimistic balance reservations), asynchronous database-polled payroll queue, and audit events.
2. **Accessible React UI**: React/TypeScript frontend with semantic user-facing roles and labels.
3. **Deterministic Quality Intelligence**:
   - Risk Analyzer and Component-to-Path Mapping (`quality/component-map.yml`)
   - Test Selection Engine with safety broadening rules (`quality:select-tests`)
   - Failure Triage Assistant with normalized evidence schema (`quality:triage`)
   - Guarded Test Healer enforcing strict prohibition against assertion weakening
   - Flaky Test Detection CLI (`quality:flaky`)
4. **Agent Evaluation Platform**:
   - Curated golden dataset of 25 realistic fixtures (`agent-evals/datasets/failure-triage/`)
   - Evaluator computing Accuracy, Precision, Recall, Macro F1, Confusion Matrix, and UNKNOWN rate
   - Versioned prompt regression architecture (`prompts/failure-triage/v1.md`, `v2.md`)
5. **Quality Gate Aggregator**:
   - Multi-source evidence aggregator (Surefire, Failsafe, Playwright, k6, PIT, Agent Evals)
   - Cryptographic SHA-256 provenance tracking and staleness detection
   - Clear release recommendations (`PASS`, `WARN`, `BLOCK`, `INSUFFICIENT_EVIDENCE`)
6. **Controlled Defect Seeds**:
   - Explicit flag-controlled injection for double finalization, slow payroll, tax calculation, and manager bypass.
   - Protected by required `demo` profile and safety checks.
7. **CI/CD Quality Gates**:
   - GitHub Actions workflows for PR (`.github/workflows/pr.yml`), Nightly (`.github/workflows/nightly.yml`), and Release (`.github/workflows/release.yml`).
