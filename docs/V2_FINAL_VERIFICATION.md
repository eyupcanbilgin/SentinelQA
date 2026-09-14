# SentinelQA V2 Final Verification Matrix

This matrix documents the verification status of every major capability in SentinelQA V2 following our Staff Quality Engineer hardening pass.

**Zero-Fabrication Policy**: Every status in this matrix reflects code that has actually executed on this system. Capabilities requiring optional external API credentials or production-grade infrastructure are labeled accordingly.

---

## 1. Master Verification Table

| Capability / Tool | Executable Command | Local Status | CI Capability | Evidence Artifact | Technical Notes & Defense |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Catalog Drift Verification** | `npm run catalog:verify` | **VERIFIED** | Configured in PR & Nightly | `quality/test-catalog.yml` | 54/54 test IDs matched between code and catalog; 0 drift. |
| **Backend Domain Unit Tests** | `npm run test:backend` | **VERIFIED** | Configured in PR & Nightly | `backend/target/surefire-reports/` | 90/90 passed (0.4s runtime); tests financial precision & leave math. |
| **PostgreSQL Integration Tests** | `npm run test:integration` | **VERIFIED** | Configured in PR & Nightly | `backend/target/failsafe-reports/` | 25/25 passed via Testcontainers + PostgreSQL 17.11; tested with English locale. |
| **Object Authorization Tests** | `npm run test:integration` | **VERIFIED** | Configured in PR & Nightly | `backend/target/failsafe-reports/TEST-...AuthApiIT.xml` | `SEC-AUTHZ-001` through `004` verified (BOLA, role boundaries, expired JWTs). |
| **Pessimistic Concurrency Tests** | `npm run test:integration` | **VERIFIED** | Configured in PR & Nightly | `backend/target/failsafe-reports/TEST-...LeaveConcurrencyIT.xml` | 3/3 passed; verifies database row locks prevent concurrent leave overdraw. |
| **Playwright E2E Critical Journeys** | `npm run test:e2e` | **VERIFIED** | Configured in PR & Nightly | `reports/playwright/results.json` | 2/2 passed against live Docker stack; uses randomized periods for idempotency. |
| **Containerized Performance Smoke** | `npm run perf:smoke` | **VERIFIED** | Configured in Nightly | `reports/k6/summary.json` | 46 requests; 0% errors; HTTP p95 = 253.8ms; auto-falls back to Docker k6. |
| **Mutation Testing (PITest)** | `npm run mutation` | **VERIFIED** | Configured in Nightly | `backend/target/pit-reports/mutations.xml` | 44/45 mutants killed (97.8% score); verifies domain test quality beyond line coverage. |
| **Intelligent Test Selection** | `npm run quality:select-tests` | **VERIFIED** | Configured in PR | `reports/test-plan.json` | Safe base ref resolution (`GITHUB_BASE_REF` $\to$ `origin/master`); enforces risk floor. |
| **Selection Benchmark** | `npm run quality:benchmark-selection` | **VERIFIED** | Independent tool suite | `reports/change-impact/benchmark.json` | 10 PR cases; 0 Critical False Negatives; 100% Critical Recall; 75.9% reduction. |
| **Guarded Healer Benchmark** | `npm run quality:benchmark-healer` | **VERIFIED** | Independent tool suite | `reports/healer-benchmark/benchmark.json` | 8 cases; 0 unsafe patches accepted (100% rejection rate for weakened assertions). |
| **Rule Baseline Evaluations** | `npm run agent-evals:holdout` | **VERIFIED** | Configured in PR | `reports/agent-evals/triage-summary.json` | 15 holdout cases; 66.7% accuracy; 33.3% abstention; resisted prompt injection. |
| **LLM Benchmark Comparison** | `npm run agent-evals:compare` | **VERIFIED** | Workflow Dispatch | `reports/agent-evals/benchmark-comparison.md` | Honestly reports `OPTIONAL_KEY_ABSENT` when OpenAI API key is not configured. |
| **Observability Trace Enrichment** | `npm run quality:enrich-evidence` | **VERIFIED** | Modular utility | `quality-intelligence/src/evidence-enrichment/` | Jaeger span lookup by correlation ID, sensitive token redaction, and truncation. |
| **Run Manifest Binding** | `npm run quality:start-run` | **VERIFIED** | Configured in PR & Nightly | `reports/run-manifest.json` | Binds run ID, Git commit, and start timestamp to reject stale artifacts. |
| **Quality Gate (PR Profile)** | `npm run quality:gate -- --profile pr` | **VERIFIED** | Configured in PR | `reports/quality-gate.json`, `.md` | Evaluates required PR sources (Unit, Integration, Security, E2E, Agent Evals). |
| **Quality Gate (Nightly Profile)** | `npm run quality:gate -- --profile nightly` | **VERIFIED** | Configured in Nightly | `reports/quality-gate.json`, `.md` | Blocks with `INSUFFICIENT_EVIDENCE` when mandatory mutation/perf evidence is stale. |

---

## 2. CI/CD Pipeline Alignment

The CI workflows in `.github/workflows/` were completely audited and restructured:
1. **`pr.yml`**:
   - Executes `npm run quality:start-run` at the start of the job.
   - Executes only the suites mandatory for PR promotion: backend unit tests, frontend build, quality tooling tests, test selection, integration & security tests, Playwright E2E journeys against a freshly started Docker stack, and agent baseline evaluations.
   - Evaluates `npm run quality:gate -- --profile pr`.
   - Uploads run manifest and all produced reports.
   - **Guaranteed Invariant**: The Quality Gate never demands evidence that the PR workflow did not execute.
2. **`nightly.yml`**:
   - Executes the complete heavy verification suite: unit, integration, full critical E2E regression, containerized k6 performance, PITest mutation testing, and holdout agent evaluations.
   - Evaluates `npm run quality:gate -- --profile nightly`.
3. **`release.yml`**:
   - Evaluates the release profile against fresh evidence.
   - Disallows release promotion on `INSUFFICIENT_EVIDENCE` or `BLOCK`.

---

## 3. Real Limitations & Engineering Boundaries

To maintain technical credibility, SentinelQA documents its exact limitations:
1. **Local & CI Reference Performance Environment**: The k6 scenarios run on shared CI or local developer machines. They verify relative latency regression and protocol correctness, not production cloud scalability.
2. **Holdout Benchmark Scale**: The holdout dataset contains 15 curated adversarial fixtures. While scientifically structured to test prompt injection and near-miss errors, an enterprise deployment should scale this to hundreds of operational cases.
3. **Optional Paid LLM Evaluation**: Real LLM evaluation requires an explicit `OPENAI_API_KEY`. When absent, the comparison benchmark reports `OPTIONAL_KEY_ABSENT` rather than quietly faking results.
4. **No Autonomous Release Decisions**: The Quality Gate provides a machine-readable recommendation (`PASS`, `WARN`, `BLOCK`, `INSUFFICIENT_EVIDENCE`), but final release authorization remains an explicit human engineering judgment.
