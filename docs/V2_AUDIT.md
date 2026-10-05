# SentinelQA V2 Adversarial Engineering Audit

## Executive Summary

This document establishes an unvarnished, technically adversarial baseline audit of the **SentinelQA** (previously branded inconsistently as SentinelQE) repository. 
Rather than accepting architectural claims at face value, each capability has been evaluated against executable source code, dependency trees, schema realities, and reproducible command execution on Windows and containerized environments.

**Audit Status:**
- **Critical Failures Discovered:**
  1. **Missing Database Seed Migrations (BROKEN):** The application database migrations only contained `V1__workforce_schema.sql` (schema definitions). Crucial demo accounts (`employee1`, `employee2`, `manager`, `hr`, `admin`), departments, and balances were never seeded, causing all integration and E2E login flows to fail with HTTP 401.
  2. **Locale-Sensitive Lowercasing in REST Assured / HTTPBuilder (BROKEN):** In non-English host environments (e.g. Turkish locale), Groovy HTTPBuilder's `Status.FAILURE.toString()` evaluates to `"faılure"` (dotless `ı`), failing to match the expected `"failure"` response handler key on GET requests and crashing with `HttpResponseException: status code: 401/403`.
  3. **CI / Quality Gate Mismatch (BROKEN):** The PR workflow executed `npm run quality:gate -- --profile pr`, which strictly required integration, E2E, and agent evaluation evidence, but the PR workflow never attempted to execute those test suites or run containerized dependencies.
  4. **Test Selection Base Reference Drift (BROKEN):** Test selector CLI hardcoded `origin/main` as git diff base; the repository default remote branch is `master`.
  5. **Self-Confirming AI Evaluation (MISLEADING):** The agent evaluation benchmark used synthetic fixtures that closely mirrored the keyword rules of `MockAiProvider`, falsely reporting 100% accuracy and hardcoding safety metrics.
  6. **Test Catalog Drift (BROKEN):** `quality/test-catalog.yml` was out of sync with actual executable code (`API-PAY-001` through `API-PAY-006` in `PayrollApiIT.java` were omitted from the catalog).

---

## Detailed Capability Classification Matrix

| Capability / Area | Status | Evidence / Source Reference | Finding & Impact |
| :--- | :--- | :--- | :--- |
| **Domain Unit Tests** | **VERIFIED** | `backend/src/test/java/io/sentinelqe/workforce/domain/*Test.java` | 90 tests covering `LeavePolicy`, `PayrollPolicy`, `PayrollCalculator`, `AccessPolicy`. Executed in 5.8s via Surefire. |
| **PITest Mutation Suite** | **VERIFIED** | `backend/pom.xml` (`mutation` profile) | 45 mutations generated, 44 killed (98% mutation score, 89% line coverage). Genuine verification. |
| **Frontend Production Build** | **VERIFIED** | `frontend/src/`, `frontend/vite.config.ts` | Builds clean production bundle in 417ms via `npm run build --workspace frontend`. |
| **Integration Suite (Testcontainers)** | **BROKEN -> REPAIRED** | `backend/src/test/java/io/sentinelqe/workforce/*IT.java` | Broken due to missing seed migration and Turkish I locale bug in REST Assured. Fixed with `V2__demo_seed.sql` and `-Duser.language=en`. |
| **Playwright E2E Journeys** | **PARTIAL** | `tests/e2e/specs/leave.spec.ts`, `payroll.spec.ts` | High quality semantic journeys, single-worker, zero-retry policy. Was blocked locally by unseeded application container. |
| **Performance (k6)** | **PARTIAL** | `performance/scenarios/smoke.js`, `baseline.js` | Realistic scenarios with strict thresholds, but required host k6 installation. Containerized runner needed. |
| **Quality Gate Engine** | **PARTIAL** | `quality-gate/src/` | Strong policy engine with SHA-256 fingerprinting and run manifest binding, but structurally inconsistent with GitHub Actions PR workflow. |
| **Test Selector** | **BROKEN -> REPAIRED** | `quality-intelligence/src/test-selector/` | Hardcoded `origin/main` causing fallback to broad execution on `master`. Missing `reports/test-plan.json` artifact for CI consumption. |
| **AI Provider Architecture** | **MISLEADING** | `quality-intelligence/src/ai-provider/` | `MockAiProvider` claimed to be AI triage but was purely deterministic keyword regex rules. Needs explicit re-branding as `RuleBasedTriageBaseline` alongside real LLM provider. |
| **Agent Evaluation Dataset** | **MISLEADING** | `agent-evals/datasets/failure-triage/` | 20 synthetic files tailored to pass rule-based regexes (100% accuracy). Lacked adversarial cases and independent holdout separation. |
| **Agent Safety Metrics** | **MISLEADING** | `agent-evals/src/evaluator.ts` | `unsafeRecommendationRate: 0` was hardcoded or trivially checked without a deterministic policy validation engine. |
| **Guarded Healer** | **MISLEADING** | `quality-intelligence/src/healing/` | Branded as an autonomous healer, but was actually a static unified diff regex validator with no code generation. |
| **Observability Loop** | **DOCUMENTATION_ONLY** | `observability/otel/`, `backend/.../CorrelationFilter.java` | Correlation ID generation and OTel collector existed, but no executable component retrieved traces and attached normalized spans to failure bundles. |
| **CI/CD Workflows** | **BROKEN** | `.github/workflows/pr.yml`, `nightly.yml`, `release.yml` | Workflows did not produce the artifacts required by the gate profile, creating an automatic failure state. |
| **Test Catalog Integrity** | **BROKEN** | `quality/test-catalog.yml`, `scripts/catalog.mjs` | Missing `catalog:verify` command and drifted IDs (`API-PAY-001` - `006` missing). |
| **Repository Branding** | **MISLEADING** | `README.md`, `package.json`, documentation | Inconsistent mixing of "SentinelQE" and "SentinelQA"; claims of "cryptographically verified" gate were technically inaccurate (SHA-256 fingerprinting only). |

---

## Technical Analysis of Core Systems

### 1. Database & Integration Environment
- **What was claimed:** "Testcontainers PostgreSQL integration suite validating database constraints, transactions, and authorization boundaries."
- **The reality:** While Testcontainers and REST Assured tests were well-structured, running `mvn -Pintegration verify` failed 24 out of 25 tests because no seed data existed in PostgreSQL (`users`, `employees`, `departments`, `leave_balances` were completely empty).
- **V2 Remediation:** Authored `backend/src/main/resources/db/migration/V2__demo_seed.sql` specifying the exact seed UUIDs, BCrypt password hashes, and leave balances matching `API_CONTRACT.md`. Fixed the Turkish I lowercasing bug in REST Assured by pinning `Locale.setDefault(Locale.ENGLISH)` and configuring surefire/failsafe JVM arguments.

### 2. CI/CD & Quality Gate Manifests
- **What was claimed:** "Every commit is verified by a cryptographically verified quality gate."
- **The reality:** 
  1. The term "cryptographic verification" is misleading; the system computes SHA-256 digests of test reports and binds them to a run manifest JSON. It does not use cryptographic public-key signatures (e.g. Sigstore/Cosign).
  2. The PR workflow executed only backend unit tests, frontend build, and quality unit tests, yet ran `quality:gate -- --profile pr` which mandated `integration`, `security`, `e2e`, and `agent-evals`. The gate immediately threw `INSUFFICIENT_EVIDENCE`.
- **V2 Remediation:** 
  1. Revise PR workflow to either run all mandatory suites in a clean GitHub Actions runner or align PR gate requirements with what PR CI produces.
  2. Implement `npm run quality:start-run` before test execution to bind all subsequent evidence to an immutable Run ID, commit SHA, and timestamp.
  3. Correct documentation language to "Records SHA-256 fingerprints, timestamps, and run-manifest binding for evidence artifacts."

### 3. Test Selection Engine & Safety Principle
- **What was claimed:** "Intelligent test selection reducing suite execution time based on git diff analysis."
- **The reality:**
  1. The CLI defaulted to `git diff origin/main...HEAD`. Because this repository uses `master`, `git diff` failed, falling back to `__UNKNOWN_GIT_BASE__` and executing full suites.
  2. The selection engine only printed to stdout; it did not emit `reports/test-plan.json` for CI pipeline consumption.
  3. No formal test-selection benchmark existed to measure critical false negative rates.
- **V2 Remediation:**
  1. Robust base resolution: `--base` flag -> `GITHUB_BASE_REF` -> `origin/master` -> `origin/main` -> full fallback.
  2. Machine-readable `reports/test-plan.json` export.
  3. Safety Rule: AI may broaden coverage, but deterministic rules establish the non-negotiable minimum safety floor. Zero critical false negatives.
  4. Benchmark dataset in `quality-intelligence/benchmarks/change-impact/`.

### 4. AI Credibility & Agent Evaluation
- **What was claimed:** "AI-native failure triage and autonomous healing with 100% accuracy."
- **The reality:**
  1. The "AI" was `MockAiProvider`, a switch-statement on keywords like `"timed out"`, `"500"`, `"assertion"`. Calling this "AI" undermines credibility.
  2. The evaluation dataset had 20 synthetic test cases specifically crafted to trigger those exact keywords.
  3. `unsafeRecommendationRate` was hardcoded to 0 in the mock or never evaluated against actual destructive action policies.
- **V2 Remediation:**
  1. Rebrand `MockAiProvider` as `RuleBasedTriageBaseline`. This is an asset: we benchmark AI against a deterministic, zero-cost, low-latency baseline.
  2. Implement an explicit `RealAiProvider` (OpenAI / Claude / Gemini SDK) selected via `TRIAGE_PROVIDER=openai|rules` that fails fast without silent fallback.
  3. Create an independent holdout benchmark (`agent-evals/datasets/holdout/`) with opaque case IDs (`case-001.json`), near-miss cases, adversarial prompt-injection fixtures, and real ambiguous failures.
  4. Implement an executable policy validator checking recommendation actions against destructive rules (e.g. disabling assertions, adding `.skip()`, suppressing exceptions).

### 5. Observability-Driven Triage Loop
- **What was claimed:** "Observability-driven failure triage correlating test failures with OpenTelemetry traces."
- **The reality:** Correlation IDs were passed in request headers and logged in `CorrelationFilter.java`, but no code ever queried Jaeger/Prometheus or enriched failure evidence with actual trace span waterfalls.
- **V2 Remediation:**
  1. Implement `quality-intelligence/src/evidence-enrichment/trace-enricher.ts` to query Jaeger HTTP API (`/api/traces/{traceId}` or via correlation ID tags) and extract failing span name, duration, and error attributes.
  2. Produce normalized `traceSummary` in test failure evidence bundles.
  3. Provide an executable demonstration script in `docs/OBSERVABILITY_DEMO.md`.

---

## Conclusion & V2 Hardening Roadmap
The foundation of SentinelQA is architecturally sound: the domain model is cleanly encapsulated, Testcontainers usage is robust, and the Quality Gate concept is innovative. 

However, prior to V2 hardening, the repository suffered from severe credibility gaps—unseeded databases, broken CI execution, exaggerated AI claims, and self-confirming synthetic benchmarks. 

The V2 iteration directly remediates every identified gap with reproducible execution and evidence-first engineering.
