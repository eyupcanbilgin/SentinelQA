# SentinelQA V2.1 Verification Matrix

This matrix documents the verification status of every major capability in SentinelQA V2.1 following our Principal Quality Engineer correctness, evidence, and credibility pass.

**Zero-Fabrication Policy**: Every status in this matrix reflects code that has actually executed on this system or GitHub Actions runners. Capabilities requiring optional external API credentials or production-grade infrastructure are labeled accordingly.

---

## 1. Master Verification Table

| Capability / Workflow | Scope / Execution Mechanism | Status | Evidence Artifact | Technical Notes & Defensibility |
| :--- | :--- | :---: | :--- | :--- |
| **PR GitHub Actions Workflow** | GitHub Actions (`pr.yml` on Ubuntu) | **VERIFIED_GITHUB** | Run `34836578931` (green) | All checks passed on GitHub runner, evaluating mandatory PR profile (PASS). |
| **Nightly GitHub Actions Workflow** | GitHub Actions (`nightly.yml` on Ubuntu) | **VERIFIED_GITHUB** | Run `34836578933` (green) | Full deep regression executed in 3m37s; evaluated nightly profile (PASS). |
| **Release GitHub Actions Workflow** | GitHub Actions (`release.yml`) | **IMPLEMENTED_NOT_VERIFIED** | `.github/workflows/release.yml` | Implemented and validated; unexecuted to avoid external release side effects. |
| **Real Jaeger Correlation Loop** | OpenTelemetry + Micrometer + Jaeger | **VERIFIED_LOCAL** | `reports/observability/live-proof.json` | Authenticated request binds `correlation.id` to span; verified via `npm run test:observability`. |
| **Patch Safety Validator** | Diff-aware syntactic & safety guardrails | **VERIFIED_LOCAL** | `reports/healer-benchmark/benchmark.json` | 8/8 proposals; 100% rejection of assertion weakening, skips, and prod edits; human review required. |
| **Test Selection Engine (Option A)** | Change-impact analysis recommendation | **VERIFIED_LOCAL** | `reports/test-plan.json` | Computes minimum plan; PR CI conservatively executes mandatory suites without dynamic suppression. |
| **Selection Recall Benchmark** | 10 simulated PR cases | **VERIFIED_LOCAL** | `reports/change-impact/benchmark.json` | 0 Critical False Negatives; 100% Critical Recall; 75.9% targeted suite reduction on low-risk changes. |
| **Agent Regression Suite (Dev)** | Deterministic failure triage (25 fixtures) | **VERIFIED_LOCAL** | `reports/agent-evals/triage-summary.json` | 25/25 passed (100% regression accuracy; 0 unsafe recommendations; blocking CI check). |
| **Adversarial Holdout Benchmark** | Unseen difficult fixtures (15 cases) | **VERIFIED_LOCAL** | `reports/agent-evals/holdout-summary.json` | 66.7% accuracy; 60.7% Macro F1; 33.3% abstention; 2 high-confidence wrong predictions; 0 unsafe actions. |
| **Real LLM Benchmark** | OpenAI / `gpt-4o-mini` | **NOT_CONFIGURED** | `reports/agent-evals/benchmark-comparison.md` | Honestly labeled `NOT_CONFIGURED` when `OPENAI_API_KEY` is not present; no synthetic faking. |
| **Quality Gate Engine** | Run manifest + SHA-256 fingerprinting | **VERIFIED_LOCAL** | `reports/quality-gate.json`, `.md` | Evaluates mandatory sources, verifies critical IDs, rejects stale evidence against run manifest. |
| **Catalog Drift Verification** | Static source reflection vs catalog | **VERIFIED_LOCAL** | `quality/test-catalog.yml` | 54/54 test IDs matched between code and catalog; 0 drift. |
| **Backend Domain Unit Tests** | JUnit 5 + AssertJ (Maven) | **VERIFIED_LOCAL** | `backend/target/surefire-reports/` | 90/90 passed (0 failures); tests financial rounding, leave math, access policy. |
| **PostgreSQL Integration Tests** | Testcontainers + PostgreSQL 17.11 | **VERIFIED_LOCAL** | `backend/target/failsafe-reports/` | 25/25 passed (`AuthApiIT`, `LeaveApiIT`, `LeaveConcurrencyIT`, `PayrollApiIT`). |
| **Object Authorization Tests** | BOLA / IDOR boundary validation | **VERIFIED_LOCAL** | `backend/target/failsafe-reports/` | `SEC-AUTHZ-001` through `004` verified (cross-tenant access, expired JWTs, payroll roles). |
| **Pessimistic Concurrency Tests** | DB row locks against race conditions | **VERIFIED_LOCAL** | `backend/target/failsafe-reports/` | 3/3 passed; verifies database row locks prevent concurrent leave overdraw. |
| **Playwright E2E Critical Journeys** | Chromium Headless Shell (live stack) | **VERIFIED_LOCAL** | `reports/playwright/results.json` | 2/2 passed against live Docker stack (`E2E-LEAVE-001`, `E2E-PAY-001`). |
| **Performance Regression Smoke** | Containerized k6 runner | **VERIFIED_LOCAL** | `reports/k6/summary.json` | 46 requests; 0% errors; HTTP p95 = 253.8ms; 8/8 thresholds passed. |
| **Mutation Testing (PITest)** | PITest 1.30.0 on domain logic | **VERIFIED_LOCAL** | `backend/target/pit-reports/mutations.xml` | 44/45 mutants killed (97.8% mutation score; test strength verification). |

---

## 2. CI/CD Pipeline Alignment

1. **`pr.yml` (Pull Request Quality Gate)**:
   - Starts run manifest with `npm run quality:start-run`.
   - Executes only mandatory PR suites: backend unit, quality unit, catalog verification, integration & security, Playwright E2E, and agent regression suite.
   - Evaluates `npm run quality:gate -- --profile pr`.
   - Verified on GitHub Actions runner (`VERIFIED_GITHUB`, Run `34836578931`, conclusion: `success`, decision: `PASS`).

2. **`nightly.yml` (Nightly Deep Quality Regression)**:
   - Starts run manifest with `npm run quality:start-run` before all test suites.
   - Executes complete heavy pipeline: unit, integration, mutation testing (PITest), live full-stack Playwright E2E, containerized k6 performance smoke, agent regression suite, and holdout benchmark.
   - Evaluates `npm run quality:gate -- --profile nightly`.
   - Verified on GitHub Actions runner (`VERIFIED_GITHUB`, Run `34836578933`, duration: 3m37s, conclusion: `success`, decision: `PASS`).
   - Triggerable manually via `workflow_dispatch` and daily at 02:00 UTC.

3. **`release.yml` (Release Promotion Gate)**:
   - Evaluates release profile against fresh evidence.
   - Blocks deployment on any missing or stale mandatory evidence.
   - Retained as `IMPLEMENTED_NOT_VERIFIED` to prevent unwanted production side-effects.

---

## 3. Real Limitations & Engineering Boundaries

1. **Test Planning vs. Execution (Option A)**:
   SentinelQA change-impact analysis produces an explainable minimum recommended test plan (`reports/test-plan.json`). PR CI intentionally retains conservative execution of mandatory safety suites rather than dynamically skipping coverage.

2. **Rule Baseline Adversarial Limitations**:
   The deterministic triage baseline produces 2 high-confidence incorrect classifications on the adversarial holdout benchmark (accuracy 66.7%, Macro F1 60.7%, abstentions 33.3%). This proves that heuristic triage must be treated as an advisory baseline rather than an authoritative root-cause classifier.

3. **Performance Smoke vs Production Capacity**:
   The k6 scenarios run on shared CI runners or local developer machines. They detect protocol-level regressions in a controlled CI scenario; they are not production capacity or cloud sizing certifications.

4. **Guarded Test Patch Validation Only**:
   SentinelQA validates proposed test patches against deterministic safety policies. It does not autonomously trust or auto-merge AI-generated code; all patches require human review.

5. **No Cryptographic Signatures**:
   The Quality Gate computes SHA-256 digests and verifies temporal freshness against an execution run manifest. It does not implement public-key cryptographic signatures or attestations.
