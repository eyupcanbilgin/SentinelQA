# SentinelQA — Independent Full Technical Audit

Audit date: **2026-09-14**. Audited commit: **`3b6c5e307a7790097be1a2a0b43483d1e55b950e`**. Repository: [eyupcanbilgin/SentinelQA](https://github.com/eyupcanbilgin/SentinelQA). This assessment treats existing documentation and earlier verification reports as claims, not evidence. No product implementation, test oracle, benchmark label, threshold, or workflow was changed to improve a result.

# 1. Executive Verdict

SentinelQA credibly exceeds a conventional browser automation portfolio: its PostgreSQL concurrency tests, object authorization checks, decimal payroll oracles, mutation testing, live tracing, and working CI form a substantive Quality Engineering demonstration. It only partially supports the broader claim of an integrated, safe, evidence-driven platform. Independent negative probes exposed stale-evidence acceptance, misleading patch-safety approvals, disconnected failure-evidence schemas, and demo administrator accounts outside the demo profile. The deterministic foundation merits a senior QA interview; the AI and release-assurance claims require correction before the repository is presented as finished.

```text
Main goal achieved: PARTIALLY
Portfolio ready: YES WITH FIXES
Merge ready: YES WITH FIXES
```

“YES WITH FIXES” means suitable after the P0 corrections below, not approval to merge the current implementation unchanged. No merge, workflow dispatch, publication, or paid LLM call was performed.

# 2. Overall Score

**69/100 — competent foundation with material gaps.** The equally weighted A–P scores total 111/160, or 69.375%, rounded to 69. This is a portfolio engineering assessment, not a reliability probability, security certification, or prediction of the owner's job performance. Working infrastructure receives credit; unsupported integration and safety claims do not.

# 3. Goal Scorecard

| Goal | Score / 10 | Reason |
| --- | ---: | --- |
| A. Modern QA Engineering | 8 | Risk, invariants, telemetry, mutation and negative gate checks form a coherent practice. |
| B. Test Architecture | 8 | Good separation of pure policies, real database/API tests and two critical browser journeys. |
| C. Business Risk Thinking | 8 | Money, leave ownership, reservation and duplicate decisions are meaningful risks. |
| D. CI/CD Quality Engineering | 7 | Current PR executes real suites and publishes evidence; failure aggregation and typechecking remain incomplete. |
| E. Performance Engineering | 7 | Business completion metric catches a reproduced slowdown; workload scale and baseline evidence are limited. |
| F. Security Testing | 7 | Meaningful vertical/horizontal authorization checks; demo seeding crosses its advertised boundary. |
| G. Observability | 6 | Live correlation works; automatic failure-to-triage integration does not. |
| H. AI-Assisted QA | 4 | Useful deterministic baseline; real-provider configuration defect and unwired semantic enrichment. |
| I. AI Evaluation | 7 | Recomputed holdout, confusion matrix and high-confidence errors are useful; small authored datasets limit inference. |
| J. Safe AI Engineering | 5 | No automatic application, explicit provider failure and abstention help; safety validators have simple bypasses. |
| K. Test Effectiveness | 8 | Real invariants, 42 killed mutants and a deliberately blocked performance regression. |
| L. Release Evidence | 6 | Correct missing/failing report semantics, but copied reports and missing manifest can still succeed. |
| M. Developer Experience | 7 | Clean environment works with prerequisites and correct order; missing JAR/typecheck/quickstart issues are real. |
| N. Reproducibility | 8 | Independently repeated Windows runs plus hosted Ubuntu artifacts; exact provenance recorded. |
| O. Portfolio Differentiation | 8 | Much stronger than a framework-only portfolio, without requiring distributed infrastructure. |
| P. Seniority Signal | 7 | Strong QA judgment in the core, weaker verification discipline around the newer platform claims. |

# 4. What SentinelQA Actually Is Today

SentinelQA is a monorepo containing a WorkforceOps reference application and command-line quality tooling. WorkforceOps is a Java 21 / Spring Boot modular monolith using JPA, Flyway and PostgreSQL, with a React/Vite frontend. Its domain includes JWT roles, employee ownership, two-stage leave approval, reserved leave balances, and asynchronous payroll processing. A scheduled worker uses database locking rather than a separate queue service. Java tests cover pure policies and real HTTP/database behavior; Playwright covers two main business journeys. TypeScript tooling maps changed paths to recommended tests, normalizes execution reports, classifies failure evidence with deterministic rules, and optionally calls an LLM. A separate utility checks externally supplied test diffs against syntactic rules. Docker Compose provides the application and optional tracing/metrics services. CI executes conservative full suites; neither the selector nor an AI agent dynamically controls which mandatory tests run.

The modular monolith is appropriate: transaction boundaries, locks and monetary state are easier to examine in one process and database. There is no architectural need here for microservices, Kubernetes, Kafka or additional browser frameworks. The observability stack has a clear teaching purpose but should remain optional. Naming is less consistent: SentinelQA, SentinelQE, `sentinel-qe`, and WorkforceOps describe overlapping project layers without a consistently explained distinction.

The production domain is sufficiently complex for serious QA demonstrations, although it remains a reference application: no tenancy model, real payroll regulation, large employee dataset, operational recovery system, or production workload evidence is implemented. Several Java controllers/services compress declarations and entire methods onto single lines, obscuring transaction and authorization reasoning. The worker and browser fixtures are more readable. `EmployeeController` combines persistence and orchestration; acceptable at this scale, but weaker than the domain-policy separation elsewhere.

# 5. Verified Strengths

- **Actual business behavior under test:** 90 Java unit cases and 25 PostgreSQL integration/API/security cases passed independently, with no skips. Parameterized authorization matrices and monetary boundaries have useful oracles, not just successful status codes.
- **Concurrency with state verification:** the two leave concurrency tests coordinate real simultaneous requests and inspect persisted reservations/consumption. The service locks both request and balance records. This is substantially more credible than mocking repository calls and asserting a lock annotation exists.
- **A small, deliberate E2E portfolio:** both browser journeys passed, with zero retries. They assert leave state progression and payroll completion/finalization, using accessible locators and bounded polling.
- **Mutation has substance:** independently generated XML contains 44 mutations, 42 killed. It demonstrates test sensitivity within four policy/calculation classes, with transparent remaining scope limitations.
- **Performance catches a business regression:** normal payroll completion p95 was 920.75 ms; the enabled slowdown produced 5,790.65 ms, k6 exit 1, and a nightly gate BLOCK.
- **Live tracing exists:** a newly issued correlation ID was found in real Jaeger data and backend logs, with six spans. This was not inferred from a Compose service name or a committed sample JSON file.
- **Current PR CI is real:** run 34836985503 at the audited head executed backend, tooling, integration, security, browser and development-evaluation steps successfully. Downloaded reports support those results.
- **Several conservative boundaries work:** missing required evidence is rejected; old report mtimes are rejected; unknown/shared changes broaden selection; mandatory deterministic test IDs are retained by the enrichment helper; explicit LLM selection does not silently become a rule run; no automatic patch application exists.

# 6. Major Weaknesses

1. **Demo accounts are installed outside demo mode.** The common Flyway location includes `V2__demo_seed.sql`. In a new database, a `default` profile application with a randomly generated signing key migrated the demo data and accepted `admin@example.test` / `LocalDemo!2026`, returning role ADMIN. These credentials are intentional public demo data; their unconditional installation is the defect.
2. **Run binding is incomplete.** The release-profile gate returned PASS after old GitHub JUnit XML was copied into a fresh run directory with fresh mtimes. It returned WARN/exit 0 without any run manifest. Hashes fingerprint the bytes observed now; they do not establish which execution produced those bytes.
3. **“Cannot weaken assertions” is false.** The validator allowed changing `toBe(100)` to `toBe(200)`, replacing it with `toBeGreaterThan(0)`, and adding an early return before an unchanged assertion. It also trusted a supplied test path while ignoring a diff header targeting production code. Human review is the remaining boundary; automatic modification was not demonstrated or attempted.
4. **The advertised telemetry-to-triage chain is disconnected.** Playwright's bundle shape does not satisfy the triage input schema; parsing enriched evidence drops `traceSummary` and `telemetrySource`. Backend log search is not implemented. A live trace summary mislabeled a child authorization span as the root.
5. **The optional LLM path is unverified and broken under the documented key configuration.** Provider selection accepts `OPENAI_API_KEY`, but the constructor only reads `AI_API_KEY`. A stubbed provider request had no abort signal or timeout. Prompt versions can silently fall back, and safety/redaction are not uniformly enforced before transmission.
6. **Green checks omit relevant failures and overstate benchmarks.** Gate typechecking fails in two places while root build and CI stay green. Selector benchmarks check hand-authored mandatory ID lists rather than historical fault detection; their PASS ignores risk/component/broadening mismatches. Flaky analysis runs hardcoded records.
7. **Documentation contains materially stale or incorrect assertions.** Examples include HALF_EVEN rounding, 97.8% mutation score, demo-only SQL data, completed log-search/triage wiring, universal patch rejection and quickstart manifest order. Existing audit documents repeat some of these claims.

# 7. README Claim Audit

The README was read in full. Verdicts apply to the audited commit and the literal scope of each claim; historical measurements are not automatically fabricated, but must be dated and linked rather than presented as current verification.

| Claim | Verdict | Evidence | Correct Wording |
| --- | --- | --- | --- |
| Evidence-backed Quality Engineering reference platform | PARTIAL | Real test/gate artifacts; release provenance holes and disconnected diagnostics | Reference QE platform with verified deterministic controls and partially integrated diagnostics. |
| AI cannot subtract mandatory tests or lower risk | SUPPORTED | Enrichment helper unions IDs and keeps the risk maximum; full suites remain in CI | Implemented safety invariant in a helper, with conservative CI execution. |
| Semantic AI change-risk enrichment / domain broadening | UNSUPPORTED | Selector CLI never invokes the helper/provider; `additionalComponents` is unused | Extension point for future semantic enrichment; current selector is deterministic. |
| Human approval; cannot weaken assertions or edit production code | MISLEADING | No auto-apply is good; independent patches received `allowed: true` despite both claimed protections | Advisory diff checks; every proposal requires full human review. |
| 90 unit cases and 25 PostgreSQL cases | SUPPORTED | Independently rerun JUnit/Failsafe results | 90 unit invocations and 25 integration/API/security invocations at this SHA. |
| Banker's HALF_EVEN rounding | MISLEADING | Calculator and API oracle use `RoundingMode.HALF_UP` | Simplified tax/deductions use HALF_UP cent rounding. |
| Two semantic-locator critical journeys | SUPPORTED | Both Playwright tests passed | Two critical journeys, zero retries in this run. |
| All 54 IDs consistent with executable tests and requirements | PARTIAL | Scanner verifies 54 scoped IDs; excludes other test families and metadata drift | 54 IDs match within the scanner's supported conventions; broader traceability is incomplete. |
| Planning rather than dynamic CI execution | SUPPORTED | Workflows run full mandatory suites regardless of plan | Change-impact analysis / risk-based test planning. |
| 100% critical recall / zero critical false negatives | PARTIAL | Reproduced on 10 authored fixtures with manually chosen mandatory lists | No missed mandatory IDs in these 10 fixture scenarios. |
| 75.9% targeted reduction on low-risk changes | MISLEADING | Denominator is all non-broadened fixtures, including higher-risk cases; CI saves no execution | 75.9% fewer recommended IDs across six targeted fixture cases; no measured CI reduction. |
| Development 25/25, not generalization evidence | SUPPORTED | Independently recomputed; rules provider | Regression coverage for current deterministic rules. |
| Holdout 66.7% accuracy, 60.7% macro F1, 33.3% abstention, two confident errors | SUPPORTED | Independently recomputed from source labels and fresh predictions | Results on 15 authored challenge cases; not an independently sourced field dataset. |
| Zero unsafe recommendations | PARTIAL | Zero matches under the project's regex policy; three clear unsafe paraphrases passed | No policy-regex violations in these outputs; semantic safety is not established. |
| Prompt-injection defense verified by case-012 | MISLEADING | A rule classifier ignored injected text; no live LLM was evaluated | One adversarial regression case for the rules baseline. |
| Real provider works with `OPENAI_API_KEY` | UNSUPPORTED | Constructor throws when only this key is provided | Current implementation requires `AI_API_KEY`; unify configuration before advertising support. |
| Missing provider key produces NOT_CONFIGURED, not fake output | SUPPORTED | No-key comparison reproduced; explicit direct selection fails | Missing-key comparison is explicitly unconfigured. |
| Completes failure → log search → trace → triage loop | UNSUPPORTED | No log-search client, incompatible bundle schema, trace summary stripped | Standalone correlation lookup and enrichment utilities; adapters remain unfinished. |
| Credential redaction and bounded evidence | PARTIAL | Some strings redacted/truncated; stack, console, diff and raw trace coverage incomplete | Partial redaction in specific paths, requiring a shared outbound boundary. |
| Real Jaeger correlation lookup | SUPPORTED | New live trace and matching backend log | Real request-to-trace correlation verified; full diagnostic loop remains partial. |
| k6 custom business metrics and local/CI limitation | SUPPORTED | Normal and slow seed runs, real JSON consumed by gate | Reference smoke regression testing, not capacity certification. |
| 45 mutants, 44 killed, 97.8% current score | MISLEADING | Current local and downloaded nightly XML show 44 generated, 42 killed | 42/44 = 95.45%, one survivor and one uncovered mutant in four classes. |
| All evaluation bound to an explicit run manifest | MISLEADING | Missing manifest yields successful WARN; report commit mismatch accepted | Freshness/fingerprint checks with optional manifest context, not complete producer binding. |
| Rejects evidence predating run | PARTIAL | Original stale mtimes rejected; copied JUnit accepted | Rejects old trusted timestamps; does not reliably identify copied old artifacts. |
| Gate verifies configured sources and specific security/E2E IDs, not planned execution | SUPPORTED | Parser/configuration and negative checks | Keep this precise scope statement. |
| PR run is green | SUPPORTED | Newer current-head run 34836985503 verified | Cite current run and its actual gate WARN; a successful job is not necessarily gate PASS. |
| Quickstart yields a fresh quality gate result | MISLEADING | Manifest appears after Java/integration/E2E/performance execution | Start manifest before any evidence-producing suite, then generate all required reports. |
| No autonomous release decision | SUPPORTED | Gate emits a recommendation; release workflow does not deploy | Keep human release judgment explicit. |

The current README generally avoids “production-grade” and explicitly acknowledges several limitations. That improvement does not reconcile contradictory safety tables and execution diagrams elsewhere in the same document. The reviewed repair implementation is regex/diff based; it is not AST-based.

# 8. Testing Architecture Assessment

| Layer | Executed scope | Unique value | Main limitation |
| --- | --- | --- | --- |
| Java unit | 90: AccessPolicy 28, LeavePolicy 32, PayrollCalculator 20, PayrollPolicy 10 | Cheap matrices, state transitions, date/money boundaries | Does not exercise persistence, lock behavior or worker recovery. |
| Integration / API | 25: Auth 8, Leave 9, Concurrency 2, Payroll 6 | Real HTTP, JWT, PostgreSQL, Flyway, transactions and async completion | Direct SQL immutability and worker failure recovery lack targeted tests. |
| Security | Subset of those 25, including four required SEC IDs | Role/ownership boundaries and salary confidentiality | Not an additional 25 tests, tenancy test suite or penetration test. |
| E2E | 2 Chromium journeys | Frontend/API wiring and visible business outcomes | Shared persistent data can exhaust balances or collide on payroll periods. |
| Quality intelligence unit | 8 | Selector invariants and enrichment examples | Little direct triage/provider/evaluator adversarial coverage. |
| Quality gate unit | 8 | Parser/configuration/report behavior | Few filesystem/run-binding scenarios; typecheck fails. |
| Performance | Smoke executed normal and slow | Protocol checks plus asynchronous business completion budget | Very small reference dataset and sample; no capacity inference. |
| Mutation | Four classes, 44 mutations | Sensitivity of pure-policy assertions | Narrow domain scope, not whole-system effectiveness. |

**Business invariant coverage.** Access-policy matrices and API checks address own-leave approval, manager scope, unauthorized salary/leave access, and payroll role boundaries. The leave flow reserves available capacity on creation, changes states through manager/HR approval, releases reservation on rejection, and consumes on final approval. Two concurrency tests exercise competing reservation and duplicate final approval with explicit database checks. Payroll tests inspect calculated tax, deductions, net pay, item count/sum, asynchronous COMPLETED status, second-finalization conflict and invalid transitions. The database enforces nonnegative monetary values, reservation limits, relationships, unique payroll periods/items, and item arithmetic.

These are useful independent oracles. The payroll API recomputes expected values from the stated rates; it does not merely compare a response to itself. The browser payroll sum relationship alone would not catch a uniformly wrong tax rate, but the lower-layer exact oracle covers that risk. Repeating critical state invariants across API and browser layers is justified because the browser also validates UI integration. Auth/security test counts must not be added again to integration counts.

**Unit quality.** Tests are predominantly pure parameterized policy tests rather than getters/setters or mock interaction tests. Coverage includes inclusive date durations, invalid ranges, monetary precision, zero/negative/null inputs, and terminal transitions. Ninety is the number of executed cases, not 90 separately designed scenarios. Two-decimal validation deliberately rejects excess scale; payroll is a simplified 20% tax plus 5% deduction model. It should not be described as regulatory payroll correctness. The mutation result supports these assertions within its scope, not concurrency behavior.

**Integration quality.** The default path started actual Testcontainers PostgreSQL 17.11 and applied Flyway migrations. Docker absence fails rather than yielding skipped green tests. HTTP servers use random ports; request specifications are local rather than global mutable REST Assured configuration. Each test truncates mutable workflow data, resets balances and active flags, and clears tokens. Same-thread execution makes this shared-database strategy deliberate. The opt-in external PostgreSQL mode is destructive to that supplied test database and requires the documented disposable-database discipline. The full test suite passed locally on Windows and in hosted Ubuntu CI; this is evidence for the current paths, not all platform configurations.

REST Assured assertions include negative statuses, error contracts, ownership, status transitions and persisted state. Readiness/login checks that assert status alone serve setup; major business tests are not HTTP-200-only demonstrations. Database schema startup is verified, but not every CHECK/FK/trigger is explicitly attacked. The immutability trigger is present in SQL; application-mediated immutability tests cannot independently prove direct SQL protection under concurrent writers.

**Playwright quality.** `getByRole` and `getByLabel` dominate; one table-row structural selector is a manageable weakness rather than pervasive brittle CSS. Source search found no `Thread.sleep`, `waitForTimeout`, XPath, `nth(`, `force: true`, `test.skip` or `test.only` in executable business tests. Matches elsewhere are intentionally unsafe diff fixtures and guardrail detection rules; a README mentions the absence of hard sleeps. Assertions and server-state polling provide synchronization. Configured retries are zero. Diagnostics attach expected journey state, observations, assertion errors, console/network metadata and correlation IDs; screenshots/traces are retained on failure.

Two E2E journeys are appropriate for this application. More UI tests would not fix the highest risks. Data isolation needs attention: leave dates are fixed in 2035 and each successful journey consumes balance; random payroll periods are drawn from a finite pool, so repeated use of the same volume is not deterministic isolation. Role switching reloads the same page and obtains a new in-memory session; it is not the separately isolated browser contexts claimed in some documentation.

**Highest-value missing scenarios:** a non-demo startup with zero demo users; direct SQL writes against finalized payroll; worker database-failure/rollback and restart behavior; competing payroll processing/finalization; invalid employee manager role; denied operations leaving no balance/audit mutation; and actual captured Playwright failure passing through enrichment and triage. These target existing contracts rather than increase test count for its own sake.

# 9. CI/CD Assessment

Initial repository checks covered status, remotes, branches, recent history and the complete `master...HEAD` changed-file inventory. The branch was `hardening/evidence-first-v2`; the default branch was `master`, with base `a458c76`. The tracked working tree was clean. GitHub authentication worked for the private repository. PR #1 was OPEN, MERGEABLE and CLEAN at the audited SHA. These mergeability fields report Git state, not acceptance of the technical risks in this audit.

| Workflow | Actual evidence | Assessment |
| --- | --- | --- |
| PR | [Run 34836985503](https://github.com/eyupcanbilgin/SentinelQA/actions/runs/34836985503), 2026-09-14 11:12 UTC; head `3b6c5e307a7790097be1a2a0b43483d1e55b950e`; success | VERIFIED_GITHUB at current head. Backend unit, frontend build, tooling, catalog, selection, PostgreSQL/API/security, Compose, Chromium, E2E, development eval and gate steps all ran. Actual artifact gate: **WARN**, because optional performance/mutation were NOT_RUN. |
| Nightly job body | [Run 34836578933](https://github.com/eyupcanbilgin/SentinelQA/actions/runs/34836578933), 2026-09-14 11:07 UTC; head `75db2879c7ae701e135febce295048f71521619a`; success | Integration, E2E, PIT, k6 smoke, development/holdout evals, selector/healer benchmarks and gate executed. Artifact gate: **PASS**. It ran under a temporary pull_request trigger, not the current scheduled/manual trigger. |
| Current nightly trigger | Current head removed that temporary pull_request trigger; remaining difference from the successful job is trigger/documentation | Job body verified at preceding SHA; current schedule/manual execution **IMPLEMENTED_NOT_VERIFIED**. Do not label a prior pull-request-triggered run proof of scheduling. |
| Release | No release workflow execution in inspected history | **IMPLEMENTED_NOT_VERIFIED**. YAML implements an audit job, not a deployment or package publication. |

The PR artifact manifest records merge checkout SHA `5d8f17fd3b4364835cfd3916f121d90cfd1141df`; the nightly artifact records `d0abac081fb95a4686bb0c32df59895a822ede7c`. These are distinct from the source head SHAs because the observed runs used pull-request merge checkouts. Preserve both identities; do not falsely call the different hashes stale just because they differ. The previous nightly run 34836160091 failed on k6 report-volume permissions; the later passing run supports the specific fix.

All workflows start the manifest before generating evidence. PR's five required sources are produced. Nightly and release additionally produce both required performance and mutation artifacts, so the earlier missing-producer/profile mismatch is fixed in the YAML. Nightly/release use smoke, not a sustained baseline, despite some documentation. The release version input is unused, and calling the workflow dangerous because it deploys is unsupported by its actual steps. No dispatch was necessary for this audit.

There are material CI gaps. The gate invocation lacks `if: always()`, so an upstream failure skips the normalized decision exactly when it would help debugging; the job still fails, so this is lost diagnostics rather than a silent green result. Artifact upload does run with `always()`. Root/workflow builds do not include gate typechecking, and executing `npm run typecheck --workspace quality-gate` independently failed with TS2362 at test line 147 and TS2345 at line 200. No explicit workflow permissions, concurrency control or job timeout is configured, and action versions use mutable major tags rather than commit pins. These are bounded maintenance concerns, not evidence that the successful tests were skipped.

Downloaded artifacts included JUnit, Failsafe, Playwright JSON, gate decisions, development evaluations, and selection reports; nightly also included PIT, k6, holdout and benchmarks. Retention is seven days for PR, fourteen for nightly and thirty for release. Failure traces can help, but backend container logs are not archived and skipped aggregation can leave no gate summary. Successful browser runs do not prove failure-attachment rendering. Private access and expiring artifacts also limit portfolio reviewers; a dated, sanitized evidence package would be more durable than a badge.

# 10. Quality Gate Assessment

The gate discovers Maven `TEST-*.xml`, reads fixed Playwright/k6/PIT/evaluation report paths, validates report structures and counts, derives security status from specific IDs in integration XML, and emits JSON plus Markdown. It checks nonempty files up to 20 MiB, SHA-256 fingerprints, mtimes, a 24-hour age window, selected embedded timestamps, and optional manifest start time. The CLI also compares the manifest commit with its checkout. Critical security IDs SEC-AUTHZ-001–004 and both E2E IDs must be present and successful. Zero execution, malformed counts, skipped critical cases and failed thresholds do not become ordinary passes.

The state model is mostly sound: **BLOCK** means a failure or invalid evidence; **INSUFFICIENT_EVIDENCE** means a required source is missing/stale/unexecuted; **WARN** permits optional missing sources or provenance warnings; **PASS** means all evaluated conditions passed. BLOCK and INSUFFICIENT_EVIDENCE return exit 1. An optional source that exists but fails still blocks, which is conservative. PR WARN for omitted optional PIT/performance is truthful. WARN for a missing release manifest undermines the stronger release-evidence claim.

The independent normal evidence run produced PR PASS and nightly PASS. The following probes used isolated copies and the actual release-profile evaluator; no original successful report was altered to conceal a failure.

| Probe | Observed result | Meaning |
| --- | --- | --- |
| Remove required E2E JSON | INSUFFICIENT_EVIDENCE, exit 1; also verified through CLI | Missing required evidence correctly fails closed. |
| Old unit XML mtimes | INSUFFICIENT_EVIDENCE, exit 1 | Basic stale-unit protection works. |
| Old integration, Playwright, k6, PIT and eval mtimes, one source per case | INSUFFICIENT_EVIDENCE, exit 1 in all five cases | Every physical source has mtime freshness enforcement. |
| Fresh mtime but old embedded Playwright startTime | INSUFFICIENT_EVIDENCE, exit 1 | Embedded UTC timestamp prevents this simple recopy bypass. |
| Fresh mtime but old embedded eval generatedAt | INSUFFICIENT_EVIDENCE, exit 1 | Same protection for eval timestamps. |
| Remove manifest, leave fresh valid reports | **WARN, exit 0** | No required single-run provenance. |
| Copy actual older GitHub PR JUnit XML after new manifest and refresh mtimes | **PASS, exit 0** | No test executed in this fixture; copied old evidence can satisfy a new run. |
| Change eval `gitCommit` to a different 40-character SHA | **PASS, exit 0** | Embedded producer commit is not checked against manifest. |
| Produce real failing payroll completion threshold | **BLOCK, exit 1** | Reported performance regression blocks correctly. |

JUnit in the tested artifacts had no usable zoned producer timestamp; the implementation treats zone-less Maven timestamps as mtime-authoritative. k6 and PIT have no enforced embedded producer timestamp. A copied/extracted report can therefore look fresh, even without malicious intent. SHA-256 records current bytes but is never checked against a trusted producer manifest; it is not a signature or an attestation. The two-second timestamp tolerance is a reasonable filesystem accommodation, not the cause of this weakness.

The gate also does not prove all planned IDs ran, all expected unit classes were present, the reports came from the intended environment, the dataset/provider is the requested one, or the tool-unit/typecheck suites passed. Its AI source is the development triage summary, not holdout capability. These are distinct scope limitations, not reasons to discard a useful normalizer.

Before calling this a run-bound release recommendation, require a manifest in release/nightly, collect producer outputs in a unique run directory, record source run ID/commit/configuration when the suite completes, and verify that envelope rather than infer origin from file mtime. Add the copied-artifact and commit-mismatch examples as acceptance cases. Cryptographic signing is not necessary to fix accidental stale reuse; precise provenance contracts are.

# 11. Test Selection Assessment

**Classification: planning only.** SentinelQA currently implements change-impact analysis / risk-based test planning, not full dynamic test execution reduction.

The CLI resolves Git references, extracts changed paths and applies the component map. Each mapped component has impact and likelihood values from 1–5; the highest product determines risk, with MEDIUM starting at 6 and HIGH at 15. Matching component tests and `always` tests enter the plan. Unknown paths, shared paths, incomplete component coverage and quality-system changes broaden to the full catalog and risk 25. The output contains selected IDs, reasons and required layers. Its confidence value of 0 or 1 denotes mapping/fallback certainty, not a calibrated probability of regression detection.

Shared infrastructure, migrations and common/security changes receive conservative mapping/fallback behavior. Frontend changes include mapped browser tests; documentation changes retain the mandatory baseline; unknown files do not silently produce zero coverage. Selection for `origin/master...HEAD` at the audited checkout broadened to all 54 IDs. These are appropriate choices while selection remains advisory.

The AI enrichment helper retains mandatory IDs and refuses a lower risk; the existing tests and independent diagnostic confirmed this invariant. It accepts nonexistent additional IDs, does not extend `requiredLayers` when adding an E2E ID, ignores `additionalComponents`, and has only a TypeScript interface at the external proposal boundary. The actual selector CLI never calls it. A malicious AI could therefore make an incoherent hypothetical plan, but it cannot currently suppress CI execution through this unwired helper. Do not claim live semantic analysis or execution reduction from the existence of this function.

The benchmark genuinely produced 10/10 PASS, 100% mandatory-ID recall, zero missing mandatory IDs, 75.9% targeted reduction and 40% broadening. Its cases are small authored path scenarios directly reflecting the map, not historical pull requests with independently known faults. Some filenames stand in for hypothetical classes. Expected risk, expected components and expected broadening are reported, but only missed mandatory test IDs determine PASS/exit status. A system designed specifically for these fixtures could pass. The reduction denominator is the six non-broadened cases, including higher-risk cases, not exclusively low-risk changes. None of this measures actual wall-clock CI savings.

Catalog verification also has a narrower contract than its wording. The 54 IDs comprise 24 unit method IDs, 25 integration/API/security IDs, two E2E IDs and three quality-intelligence IDs; parameterized invocations explain why unit execution totals exceed unit IDs. The scanner excludes gate tests and unsupported prefixes such as enrichment test IDs; performance check labels do not match the scanner's declaration patterns, so the performance requirement is omitted from generated traceability. It detects duplicate supported source IDs and missing ID membership, but does not compare layer/component/source metadata, collapses committed IDs into a Set, validates catalog requirements against a hardcoded dictionary rather than the committed requirements set, and does not establish bidirectional requirement coverage. “54/54” is real within this convention; “all tests and requirements have no drift” is not established.

# 12. Performance Assessment

The scripts exercise authenticated login, employee reads, leave transitions and payroll processing. They verify statuses and business outcomes, propagate correlation IDs, and poll asynchronous payroll completion within a bound. Custom `leave_transaction_ms`, `payroll_completion_ms` and payroll-completion counts add value beyond generic HTTP latency. The container fallback actually executed k6 **0.57.0** in this audit; installed but unused tools elsewhere on the machine are not evidence of the executing version.

| Script | Implemented workload | Correct classification | Independent status |
| --- | --- | --- | --- |
| smoke | Four scenarios, up to four VUs, 14 shared iterations: 2 login, 8 read, 2 leave, 2 payroll | Functional/performance smoke regression probe | VERIFIED, normal and seeded slow runs |
| baseline | Login 1 VU, reads 6, leave 2 for 60 seconds; payroll 1 VU / 10 iterations | Small closed-loop reference load | IMPLEMENTED_NOT_VERIFIED in this audit |
| stress | Reads ramp to 24 VUs over 60 seconds, login 2, leave 4, payroll 1 / 12 iterations up to 90 seconds | Illustrative ramped load, not established saturation/capacity testing | IMPLEMENTED_NOT_VERIFIED in this audit |

Historical descriptions of one smoke VU, 50 stress VUs or a five-minute workload do not match these files. The demo employee count is tiny, traffic uses fixed functional mixes, and no representative production sizing, saturation curve or sustained soak was verified. Current README appropriately calls measurements local/CI reference indicators.

| Observation | Normal | Slow payroll seed |
| --- | ---: | ---: |
| HTTP requests | 46 | 148 |
| HTTP request failure rate | 0% | 0% |
| HTTP request p95 | 307.1088 ms | 77.6739 ms |
| Payroll completion p95 | 920.75 ms | 5,790.65 ms |
| k6 command | PASS / exit 0 | FAIL / exit 1 |
| Nightly profile gate | PASS / exit 0 | BLOCK / exit 1 |

All eight normal thresholds passed. The slow run crossed `payroll_completion_ms p(95)<2500`. It deliberately delayed the queued job by five seconds, gated by demo profile plus explicit seed enablement. Normal and slow summaries and decisions were retained separately. The lower HTTP p95 in the slow run is not a performance improvement: extra quick polling requests change the distribution while the user waits much longer. This makes the custom business metric a particularly strong design choice.

HTTP p95 below 750 ms, error rate below 1%, operation checks and a 2.5-second payroll completion budget are useful illustrative engineering budgets. The files do not establish them as statistically calibrated historical regression thresholds or production SLOs. Two payroll completions cannot estimate a stable tail distribution. Keep the smoke gate for large regressions; do not sell one measured p95 as capacity. Baseline repetition and environment metadata would improve interpretation before tightening thresholds.

Four controlled seeds exist: duplicate finalization guard bypass, delayed payroll eligibility, wrong tax rate, and manager-scope bypass. They are OFF by default and fail startup when requested without the explicit enabling guard; their active behavior requires demo mode. Only the performance defect was independently enabled during this audit. Others were inspected, not claimed as demonstrated. Documentation names the manager flag incorrectly in places; the actual flag ends `_BYPASS_MANAGER_CHECK`. The manager-scope defect belongs to leave authorization, not the documented payroll role test. Unit tests construct the calculator without `DefectSeeds`, so merely exporting the wrong-tax flag does not make that pure unit suite test the injected rate. An API run using the seeded application would be the appropriate demonstration. No executable intermittent-failure or stale-selector seed was found; do not count hypothetical examples as implemented defects.

# 13. Observability Assessment

**Request correlation: VERIFIED_END_TO_END. Complete failure-evidence-to-triage workflow: PARTIAL.**

An isolated live stack ran the backend, OpenTelemetry collector and Jaeger. `npm run test:observability`, with audit-specific application and Jaeger URLs, generated a new request and looked it up. Independently fetched Jaeger JSON and backend logs contained:

```text
correlation ID: corr-verify-1789403070283
trace ID:       6e17d5e3b32f89d11623020c05abfa26
span count:     6
actual root:    http get /api/employees/{id}
root span ID:   09eb770866bf0fe4
root duration:  29,912 microseconds (29.912 ms)
HTTP status:    200
```

The backend bounds and sanitizes incoming correlation IDs, echoes them and associates `correlation.id` with tracing. The log line included the same correlation, trace and root-span IDs. This is meaningful operational instrumentation.

However, the enrichment output called `authorize request` the root because it uses the first span returned by Jaeger rather than parent relationships. It reports the longest individual span as overall duration, takes the first ten spans without the claimed relevance sort, and recognizes only a limited set of error tags. The observed root-label error is reproduced; robust error-status handling is a source-level limitation, not a claimed reproduced missed production incident.

The claimed chain breaks at multiple boundaries. Playwright emits `journey`, `assertionErrors`, `network` and `correlationIds`; the triage/enrichment schema expects `testName`, `layer`, `errorMessage`, `networkLogs` and singular `correlationId`. The source-shaped diagnostic failed schema validation. Parsing an enriched bundle removes `traceSummary` and `telemetrySource` because they are absent from the accepted schema. `traceId` can remain, but the deterministic rules do not reason about trace spans. There is no automated backend log search; enrichment only receives logs already supplied by another caller. A successful standalone synthetic request therefore does not prove a real failing browser test can traverse the whole workflow.

Tracing is exported through the collector to Jaeger. Prometheus scrapes the backend directly; it is not an OpenTelemetry-to-Prometheus export chain. Grafana datasource/dashboard provisioning exists, but no actual dashboard JSON is shipped in the mounted dashboard directory. No custom payroll tracing spans, persisted async context propagation or business Prometheus metrics were established. Collector/Jaeger startup must not be confused with explicit healthchecks: those services do not declare Compose healthchecks.

The useful next observability work is one real failure traversing collection, redaction, lookup and triage, with schema preservation assertions. More dashboards would not fix the integration defect.

# 14. AI Architecture Assessment

**Deterministic baseline.** Default triage uses `RuleBasedTriageBaseline`, a keyword/status/retry heuristic producing a structured classification, confidence, component, evidence, owner and action. Calling it an LLM agent would be misleading. A cheap, explicit baseline is a good experimental control and can still help route common failures. Its confidence values are constants associated with branches, not calibrated probabilities. A retry-success flag can dominate a real intermittent product defect; keyword order can mistake backend races for dirty test data. The risk-analyzer module is an alias to deterministic selection, not another independent AI capability.

**LLM integration.** A real HTTP provider and local Zod output validation exist. Explicitly requesting an unconfigured provider fails instead of silently substituting rules, which is correct. The advertised `OPENAI_API_KEY` path is broken: provider selection accepts it, while `RealAiProvider` only reads `AI_API_KEY`. This was reproduced using synthetic key strings, not user secrets. A stubbed `fetch` returning schema-valid JSON confirmed no timeout/abort signal is attached. There is no explicit output token cap or whole-input budget, and the API asks for a JSON object rather than passing a concrete constrained output schema. HTTP error bodies are included in thrown errors. Missing prompt versions silently become a generic prompt while metadata can continue to report the requested version. The options/model metadata and environment-selected model are not uniformly bound to the executed request.

**Evaluation.** The suite separates evidence sent to triage from expected labels used to score it. Development and holdout source hashes and Git commit are recorded. Comparison with both key variables removed in the audit child process correctly reported the optional LLM as NOT_CONFIGURED. No live LLM inference, cost, accuracy, prompt-injection resistance or latency was measured. The comparison runner can catch provider failure and leave no comparable row while still exiting successfully; an absent failed benchmark should remain explicit. Rules ignore prompt content, so their development pass does not validate the quality of a changed LLM prompt.

**Safety.** There is no autonomous release or code-application loop. This materially limits damage. Schema validation constrains output shape, and UNKNOWN enables abstention, but neither validates a diagnosis. The unsafe-action evaluator is actually computed, not a fabricated constant; its regex coverage is shallow. It accepted all three independent examples below:

```text
Increase the timeout to 600000 milliseconds without investigation.
Ignore the authorization failure and ship the release.
Replace the exact salary comparison with a nonempty response check.
```

The policy runs in evaluation rather than enforcing a universal runtime triage boundary. Redaction is similarly fragmented: enrichment sanitizes the error message and backend/network strings, but synthetic secret canaries remained in stackTrace, consoleLogs and gitDiff. The provider can receive evidence directly without going through enrichment. No real credentials were sent in this audit. A single schema-preserving outbound sanitizer, bounded request lifecycle and explicit unsafe/unknown result handling are more valuable than adding another model.

# 15. Development vs Holdout Evaluation

Fresh predictions were scored with a separate audit script, without importing the repository's metrics function. It loaded expected classes from development fixtures or holdout labels, matched case IDs, rebuilt the confusion matrix and recomputed precision/recall/F1 from counts. Recomputed values agree with the generated reports after rounding. The unsafe-rate values below remain the repository policy's verdicts; the independent counterexamples in section 14 show why that metric is limited.

| Metric | Development | Holdout |
| --- | ---: | ---: |
| Cases | 25 | 15 |
| Correct classifications | 25 | 10 |
| Accuracy | 100% | 66.6667% |
| Macro F1, including UNKNOWN as a class | 1.0000 | 0.607143 |
| UNKNOWN predictions | 2 | 5 |
| UNKNOWN rate | 8% | 33.3333% |
| Non-abstained coverage | 92% | 66.6667% |
| Accuracy among non-UNKNOWN predictions | 100% | 80% (8/10) |
| High-confidence wrong predictions, confidence >= 0.85 and non-UNKNOWN | 0 | 2 |
| Recommendations flagged unsafe by current regex | 0/25 | 0/15 |

Holdout confusion matrix, rows expected and columns predicted:

| Expected \ Predicted | ENVIRONMENT | FLAKY_TEST | PRODUCT_DEFECT | TEST_DATA | TEST_DEFECT | UNKNOWN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ENVIRONMENT | 2 | 0 | 0 | 0 | 0 | 0 |
| FLAKY_TEST | 0 | 3 | 0 | 0 | 0 | 0 |
| PRODUCT_DEFECT | 0 | 0 | 2 | 1 | 1 | 1 |
| TEST_DATA | 0 | 0 | 0 | 0 | 0 | 1 |
| TEST_DEFECT | 0 | 0 | 0 | 0 | 1 | 1 |
| UNKNOWN | 0 | 0 | 0 | 0 | 0 | 2 |

Holdout product-defect recall is only **2/5 = 40%**. This is more relevant to QA triage risk than overall accuracy alone. UNKNOWN precision is 2/5; three abstentions are missed determinate labels. The two expected UNKNOWN cases count as correct in overall accuracy, while being excluded from the non-abstained denominator. These definitions must remain explicit.

The development set closely matches the rule vocabulary, so 100% is credible as regression behavior and weak as capability evidence. Holdout files are structurally separate and include conflicting signals, near misses and an injection attempt, which improves the assessment. “Independent” authoring or blinding cannot be established from a label file declaring itself independent: code and challenge data live in the same repository and were developed together. This is a small authored challenge set, not unseen operational failures from an external evaluator.

Label quality also deserves review. Case-012 presents invalid leave dates, an HTTP 400 and a domain validation exception; without an expected-valid-input contract, labeling that a product defect is debatable. Case-006 labels a retried lock timeout as a flaky test, although a repeatable product concurrency defect could also be intermittent. Case-013 uses Redis even though this application's stack does not; acceptable for generic triage, but not proof of realistic WorkforceOps failures. Do not silently relabel these to raise scores. Preserve versions and record adjudication rationale.

Holdout is intentionally informational and exits zero despite five misclassifications. The PR quality gate consumes development regression accuracy, not this holdout. That distinction is defensible, provided a green gate is never presented as evidence that AI diagnosis has achieved a capability threshold. No statistical confidence or calibration conclusion is supportable from fifteen cases.

# 16. High-Confidence Error Analysis

| Case | Actual label / prediction | Why it failed | Consequence |
| --- | --- | --- | --- |
| case-002 | PRODUCT_DEFECT → TEST_DEFECT, confidence 0.86 | The visible locator timeout wins while backend 500/NPE evidence is present in log/network text rather than the decisive structured status field. | Recommending selector or expectation changes could hide a backend failure and route work to the wrong owner. |
| case-004 | PRODUCT_DEFECT → TEST_DATA, confidence 0.88 | A unique-constraint phrase triggers the test-data rule before service-race evidence is resolved. Logs describe a missing concurrency control. | Resetting data may temporarily hide the collision while the product race survives. |

Both outcomes were reproduced. The emitted actions respectively recommend reviewing selectors/updating expectations and resetting fixtures/ensuring isolation. They are plausible-sounding, high-confidence advice directed at the wrong cause. The constants .86 and .88 have no calibration basis. Prefer lower confidence or abstention when strong evidence conflicts, retain the contradictory signals in the output, and evaluate routing/action correctness separately from class accuracy. Cases 001, 003 and 014 were the other holdout misses, all UNKNOWN; abstaining is safer than false certainty but remains incomplete capability.

# 17. Patch Repair / Healer Assessment

**Classification: patch validator.** It is neither a true healer nor a repair proposal generator. It accepts supplied patch text and a target path, counts changed-line assertion/skip patterns, searches forbidden additions and emits a review decision. It does not observe a broken locator, generate a repair, apply it in isolation, rerun the original assertion or open a reviewed change. Existing “healer” names should not imply these capabilities.

The author's eight-case benchmark passed: two permitted examples and six rejected unsafe examples. It demonstrates those fixtures, not universal protection. Independent probes called the actual exported validator:

| Submitted change | Observed | Assessment |
| --- | --- | --- |
| `expect(total).toBe(100)` → `expect(total).toBe(200)` | allowed | Business expectation changed without detection. |
| `toBe(100)` → `toBeGreaterThan(0)` | allowed | Exact financial oracle weakened. |
| Insert `return;` before an unchanged assertion | allowed | Assertion execution bypassed; changed-line counts miss it. |
| Diff header targets frontend production code, caller supplies test-file target | allowed | Header paths and declared target are not reconciled. |
| Timeout 1,000 → 9,000 ms | allowed | Substantial inflation below a five-digit regex threshold is not detected. |
| Explicit traversal ending in `frontend/src/App.tsx` | rejected | The tested production-path substring check worked; this specific traversal was not a successful bypass. |

All returned `humanApprovalRequired: true`. These findings concern a false “safe” classification, not a demonstrated automatic production-code execution path. Path handling replaces slashes but does not fully canonicalize traversal; every file in an actual unified diff needs validation. Multiline changes, helper calls, alternative assertions and control-flow suppression exceed line regex reasoning. Assertions-before/after metrics actually count changed lines, not assertions in complete files.

There is no AST parser in the validator. Even AST matching would not prove semantic equivalence of assertions. A sensible bounded feature would permit only a small locator-edit subset, reject assertion/control-flow/timeout changes, verify actual diff paths, run the unchanged business oracle and keep human approval. Alternatively retain the existing implementation as an explicitly advisory diff linter. Either is more defensible than claiming 100% rejection of weakening.

# 18. Security Assessment

QA-level authorization is meaningful. Missing, malformed and expired tokens, login failure, role restrictions, employee salary confidentiality and object ownership are exercised. The pure AccessPolicy matrix adds combinations that would be expensive to repeat through a browser. Horizontal access between employees and vertical access to payroll administration are represented; manager relationships are enforced in leave operations. Error responses include a bounded correlation ID. Passwords are bcrypt-hashed, JWTs use issuer/expiry validation, and login uses a dummy password hash for nonexistent users. These are credible reference-application choices.

There is no tenant concept, so “cross-tenant” coverage is not supported. This is not a penetration test, and auth boundary checks do not certify rate limiting, token revocation, all sensitive response surfaces or every malformed JWT claim. Existing tokens carry their role until expiry; no revocation/refresh system was demonstrated. These limitations should be scoped honestly rather than automatically expanding the project into an identity platform.

The most consequential reproduced repository/application boundary defect is unconditional demo seeding. A separate fresh `audit_non_demo` database ran common Flyway V1/V2 with profile `default`, a newly generated signing key and seed flags off. After startup, the documented demo administrator credentials authenticated successfully. The seed is not selected by `application-demo.yml`; its SQL is in the common migration path. Localhost Compose bindings reduce accidental exposure during the demo, but do not repair a non-demo deployment's known administrator account. Move demo data provisioning behind an explicit demo-only mechanism and test both startup modes.

Employee hierarchy validation only checks that a proposed manager ID exists; it does not ensure that account can perform the MANAGER role. Such a relation can leave a request without the intended manager approval path. This is a source-supported product-logic gap, not a reproduced authorization bypass. Lists are unpaginated and some view construction performs repeated lookups, making the five-employee demo unsuitable as scalability evidence.

A metadata-only high-confidence pattern scan of 241 tracked files found zero private-key blocks, GitHub tokens, AWS access-key IDs or OpenAI-style key patterns. Manual configuration review found intentional demo passwords/signing values and test-only keys, not verified live credentials, corporate data or private production hostnames. This limited scan is not proof that all possible secret formats are absent. `.env`, `.env.*`, generated reports and artifacts are ignored; `.env.example` is permitted by the ignore rule but absent. npm audit reported zero advisories across its dependency scope; Java libraries and container images were not independently vulnerability-scanned. No dependencies were upgraded.

Failure evidence needs a single redaction boundary before any external provider: enrichment leaves several fields untouched, and raw Playwright traces can include authentication exchanges even if the custom JSON attachment is sanitized. Keep raw diagnostics restricted and publish only explicitly reviewed evidence. These are concrete collection-path limitations, not evidence of an actual secret transmission during this audit.

# 19. Mutation Assessment

PIT targets exactly **LeavePolicy, PayrollCalculator, PayrollPolicy and AccessPolicy**, with `domain.*Test` as the target tests. It uses the default configured PIT mutators; actual emitted operators included conditional boundaries, negated conditionals, math and primitive/boolean/null returns. It excludes repositories, service transactions, LeaveBalance reservation/consumption, PayrollRun/worker behavior, database triggers and frontend logic. Narrow scope is legitimate for fast mutation feedback if the score is labeled accordingly.

Independent XML and the downloaded successful nightly artifact agree:

```text
Generated:           44
KILLED:              42
SURVIVED:             1
NO_COVERAGE:          1
Mutation score:      42 / 44 = 95.4545%
Covered-test strength:42 / 43 = 97.6744% (PIT displays 98%)
Mutated-class line coverage: 31 / 34 = 91.18%
```

The README's 44/45 = 97.8% is not the audited result. Excluding the uncovered mutation and calling the resulting test strength the mutation score would also be misleading.

The survivor is a **ConditionalsBoundary** mutation in `LeavePolicy.duration`, line 11: the guard `days > Integer.MAX_VALUE` becomes `days >= Integer.MAX_VALUE`. Tests do not distinguish the exactly-maximum representable duration. This extreme calendar interval has little ordinary business likelihood, but the mutant is not automatically equivalent; it changes an accepted boundary. Either specify a practical maximum leave range and test it, or document/test the intended arithmetic boundary.

The uncovered mutant is **NegateConditionals** in `PayrollCalculator.calculate`, line 32, around the optional injected wrong-tax path. Pure tests instantiate `new PayrollCalculator()` without `DefectSeeds`, so this branch is not exercised. This is both a scope limitation and evidence that the documented environment-flag/unit-test demonstration is inaccurate.

PIT's configured mutation threshold is 80%, while the quality gate accepts 75%; align or explicitly justify the difference so two decision authorities do not disagree. Extending mutation to balance and payroll state logic would provide more value than chasing a perfect score on the extreme duration boundary. Database concurrency effectiveness still requires targeted integration faults rather than a policy-only mutation percentage.

# 20. Evidence & Reproducibility Assessment

The audit used a detached worktree at the exact SHA, a fresh npm install, and an isolated Compose project with fresh PostgreSQL storage. Existing user application containers were not reused for the independent run. Audit ports were backend 18080, frontend 13000, PostgreSQL 15432, Jaeger 26686, collector 14318/23133, Prometheus 19090 and Grafana 13001. A separate non-demo diagnostic used port 18081 and a separate database. Audit services were stopped after verification; the normal audit backend's seed flags were restored before shutdown. Diagnostic files and volumes remain available for inspection, not as a claim of a clean production deployment.

Environment observed: Windows/PowerShell, Java **21.0.6**, Maven **3.9.9**, Node **20.19.0**, npm **10.8.2**, Docker server **27.4.0**, Compose **2.31.0**, container k6 **0.57.0**. The fresh evidence manifest was created **before** test execution:

```text
runId:     eb2a5f11-5253-49d9-b293-9d6186c6ee28
commit:    3b6c5e307a7790097be1a2a0b43483d1e55b950e
startedAt: 2026-09-14T16:19:43.794Z
```

| Command / operation | Actual result |
| --- | --- |
| `npm ci` | PASS; clean worktree installation. |
| `npm run build` | PASS; frontend and quality-intelligence builds only. |
| `npm run quality:start-run` before suites | PASS; manifest above. |
| `npm run test:unit` | PASS; 8 intelligence + 8 gate cases. |
| `npm run test:backend` | PASS; 90, no skips. |
| `npm run test:integration` | PASS; 25 real PostgreSQL cases, no skips; packages backend JAR. |
| `npm run catalog:verify` | PASS; 54 supported IDs. |
| `npm run quality:benchmark-selection` | PASS; 10 fixture cases, limited claim scope. |
| `npm run quality:benchmark-healer` | PASS; author's eight examples, contradicted by broader audit probes. |
| `npm run up` after npm build/unit, before Maven packaging | FAIL; missing backend JAR at Docker COPY. |
| Compose up/build/wait after integration packaging, optional observability profile and isolated port override | PASS; application and telemetry available. |
| `npm run test:e2e`, audit E2E URL | PASS; 2/2, zero retries. |
| `npm run perf:smoke` | PASS normally; intentionally FAIL with slow seed. |
| `npm run mutation` | PASS; 42 killed / 44 generated. |
| `npm run agent-evals` | PASS; 25/25 rules regression. |
| `npm run agent-evals:holdout` | Completed informational run; 10/15, not a perfect PASS claim. |
| `npm run agent-evals:compare` | Rules run completed; optional LLM explicitly NOT_CONFIGURED with both key variables removed in child environment. |
| `npm run test:observability`, audit application/Jaeger URLs | PASS for real request correlation. |
| `npm run quality:gate -- --profile pr` | PASS with all fresh local sources present. |
| `npm run quality:gate -- --profile nightly` | PASS normal; BLOCK after actual slow k6 result. |
| `npm run typecheck --workspace tests/e2e` | PASS. |
| `npm run typecheck --workspace quality-gate` | FAIL; two test typing errors, independently repeated and logged. |
| `npm audit --json` | Zero reported npm vulnerabilities. |
| Actual release-profile negative probes | Missing/old sources rejected; copied old JUnit and wrong report commit accepted; missing manifest WARN. |
| Baseline/stress, live LLM, current scheduled/manual nightly and release dispatch | NOT independently executed. |

The clean Docker failure is a real DX issue: the backend Dockerfile copies a prebuilt JAR, while root npm build does not build Java and Maven `test` does not package it. The complete README sequence happens to run integration `verify` before `up`, which produces the JAR; the shorter intuitive sequence does not work. Add Maven to prerequisites or provide a wrapper and make the packaging prerequisite explicit. README also says Node 20+, but the workspace requires at least 20.19.0, and `npm ci` is the reproducible install command. A working Java/Maven installation remains necessary despite Docker being available. An `.env.example` would make the deliberate demo configuration easier to inspect.

Cross-platform wrappers handle the main Maven/k6 paths, and both local Windows and Ubuntu CI results are concrete portability evidence. Turkish-locale mitigation sets `-Duser.language=en -Duser.country=US` in Java launch/test paths and `Locale.ENGLISH` in the integration harness. This is a legitimate way to stabilize locale-sensitive test/client infrastructure. It also suppresses Turkish-locale behavior in those runs and cannot replace targeted product tests using `tr-TR`. Product email normalization correctly uses `Locale.ROOT`. Do not claim all Turkish locale behavior was verified by forcing English.

Dependency choices worked together in the observed execution: Java 21/Spring Boot 3.5.16, PostgreSQL 17.11, React 19.3, Vite 8.3, TypeScript 7.0.2 and Playwright 1.63. The lockfile pins npm resolution; several service images use digests. Other inputs remain mutable, including the backend Java base, k6 tag and CI action tags. The k6 runner's attempted chmod fallback references `chmodSync` without importing it and swallows that error; the executed container path succeeds using UID 0. That is an implementation cleanup issue, not evidence of an unavailable k6 test. Avoid unsolicited version churn; fix known reproducibility contracts first.

Representative source anchors at the immutable audited SHA:

| Area | Source |
| --- | --- |
| Demo data boundary | [Common demo migration](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/backend/src/main/resources/db/migration/V2__demo_seed.sql), [base configuration](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/backend/src/main/resources/application.yml) |
| Transactional domain | [LeaveService](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/backend/src/main/java/io/sentinelqe/workforce/leave/LeaveService.java), [PayrollProcessor](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollProcessor.java) |
| Gate freshness and decision | [Gate implementation](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-gate/src/gate.ts#L51), [normalizers](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-gate/src/normalize.ts) |
| Selector/enrichment | [Selection implementation](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/test-selector/selection.ts), [catalog scanner](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/scripts/catalog.mjs) |
| Patch checks | [Guardrails](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/guarded-healer/guardrails.ts) |
| Evidence schemas and telemetry | [Browser fixture](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/tests/e2e/fixtures/workforce.ts), [enricher](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/evidence-enrichment/enricher.ts), [triage evidence schema](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/failure-triage/evidence.ts) |
| Provider and routing | [Real provider](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/providers/real-provider.ts#L10), [triage provider selection](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/quality-intelligence/src/failure-triage/triage.ts) |
| Mutation scope | [Backend Maven configuration](https://github.com/eyupcanbilgin/SentinelQA/blob/3b6c5e307a7790097be1a2a0b43483d1e55b950e/backend/pom.xml#L34) |

Local raw evidence is preserved at [audit artifacts](C:/Users/TKA/Documents/ChatGPT/SentinelQA/artifacts/independent-audit), including installation/build/test logs, GitHub run JSON/downloads, raw live trace, npm audit, metadata-only secret scan and gate typecheck output. The [verification directory](C:/Users/TKA/Documents/ChatGPT/SentinelQA/artifacts/independent-audit/verification) contains normal/slow summaries, positive/negative gate results, independent metric recomputation, synthetic safety probes and non-demo login proof. Diagnostic scripts remain in [the isolated worktree](C:/Users/TKA/Documents/ChatGPT/SentinelQA/.tools/independent-audit-3b6c5e3/reports/audit). These generated files are intentionally ignored and are not automatically included with this Markdown report in Git; remote readers can use the immutable source/run links and the explicit outcomes above. Copied evidence preserves its source identity; it must not be presented as newly executed just because the archive copy is newer.

For a new independent run, use a fresh checkout at the audited SHA, install the listed prerequisites and Chromium, then execute `quality:start-run` before backend/unit/integration/E2E/eval reports. Run Maven integration `verify` before the runtime-only Docker image build. Add PIT and k6 before the nightly/release gate. Keep deliberate failing variants in separate report directories. Downloading old reports is useful for audit comparison, but is not a substitute for this execution order.

Existing documentation was reviewed as claims. Architecture/ADR explanations of a modular monolith, Testcontainers, a small E2E set and deterministic AI boundaries add useful rationale. Several verification/demo documents are stale: the V2 matrix claims three concurrency tests and cross-tenant behavior, while code has two leave concurrency tests and no tenancy; some demo steps cite nonexistent INT-PAY IDs, unavailable example evidence, or unsupported trace trees; test-data text calls seeds demo-only and describes available days as spendable despite a separate reservation field. Older AI documentation references mock/legacy dataset paths while the runner uses development and holdout. The duplicated legacy failure-triage dataset and its generator increase ambiguity. Current docs should have one dated evidence table and explicitly archived historical reports, not several conflicting sources of truth.

# 21. Portfolio Theater Detection

| Item | Decision | Reason |
| --- | --- | --- |
| PostgreSQL locks, database constraints and real concurrency tests | KEEP | Solve concrete integrity risks and are independently executable. |
| Four-class PIT demonstration | KEEP | Useful evidence of policy-test sensitivity when its scope and denominator are explicit. |
| k6 payroll completion metric and slow seed | KEEP | Reproduced a meaningful failure that generic HTTP latency missed. |
| Deterministic triage baseline plus disappointing holdout results | KEEP | Comparing an inexpensive baseline and acknowledging failure shows better judgment than pretending AI is always useful. |
| Optional OpenTelemetry/Jaeger stack | KEEP | Real correlation works; complete one useful diagnosis path before expanding it. |
| “AI risk enrichment” in architecture diagrams | SIMPLIFY | Label as an unwired extension point or remove from the current execution diagram. |
| “Guarded healer” naming and universal safety claims | SIMPLIFY | Implemented capability is an advisory patch validator with known counterexamples. |
| Flaky-analysis CLI's hardcoded six-result dataset | REMOVE | It does not ingest actual run history or track flakiness over time. It may remain only as a clearly named example fixture. |
| Empty Grafana dashboard provisioning | SIMPLIFY | A configured directory is not a working quality dashboard. Remove the implied capability or ship one useful verified view. |
| Risk-analyzer re-export and legacy mock/provider terminology | SIMPLIFY | Avoid implying multiple intelligent subsystems where there is one deterministic function. |
| Duplicate legacy triage dataset/generator | REMOVE | Creates conflicting dataset paths and no additional validated capability. |
| Overlapping “final verified” audit/evidence documents | SIMPLIFY | One current evidence index plus dated history is easier to defend than contradictory finality claims. |

**KEEP:** the monolith, real PostgreSQL tests, explicit authorization policies, independent monetary oracles, two browser journeys, conservative selection, mutation scope disclosure and human release judgment.

**CHANGE:** run provenance, non-demo seed isolation, patch-check language/contracts, shared failure-evidence schema, provider configuration/redaction, CI typechecking/failure artifacts, and current evidence documentation.

**DELETE / SIMPLIFY:** the operational-looking hardcoded flaky report, redundant legacy datasets and aliases, unsupported diagram arrows and repeated completion claims. There is no need to delete useful tools just because they are deterministic. Their names and guarantees should accurately describe what they do.

# 22. Hiring Manager Assessment

**I would shortlist the owner for a Senior QA Engineer interview**, assuming the owner can explain the implementation and acknowledge this audit's limitations. The repository can also support a Senior SDET / Quality Engineer discussion, but does not establish that level solely through the current platform abstractions. Closest requested category: **Senior QA Engineer**.

In a five-minute review, the domain invariants, Testcontainers, mutation testing and business-oriented performance metric stand out. The explicit 66.7% holdout result and two confident mistakes are more credible than a perfect AI badge. A reviewer can see risk-based thinking beyond browser scripts.

The volume of generated-looking documentation, inconsistent names, one-line Java services, unused extension points and confident claims around incompletely connected components would prompt scrutiny. These are observable code/document characteristics, not proof of who or what authored the code. A large framework list is not itself evidence of seniority.

The candidate should demonstrate a concurrent leave test, interpret the database outcome, show normal-to-slow gate behavior and explain an accepted unsafe patch. Owning these limitations would strengthen the interview. Insisting the existing guardrail is semantically safe or that 100% fixture recall proves real test-selection safety would weaken it.

The next-level gap is closed-loop engineering discipline: validate the boundaries between tools, attach claims to current producer evidence, design failure recovery, and keep documentation aligned with executable behavior. Those are more relevant to senior SDET or staff-level confidence than adding a new agent, testing framework or infrastructure layer. “Staff-like portfolio thinking” is visible in the ambition, but not yet consistently in implementation depth.

# 23. Interview Risk

The highest interview risk is confusing a demonstration with a guarantee. A reviewer may ask for a fresh run rather than the README screenshot, request a patch-safety counterexample, inspect the actual PIT XML, or follow one Playwright failure into triage. The current repository has precise answers in some areas and gaps in others.

Claims likely to backfire include calling the rule classifier an autonomous AI agent, calling the diff linter a healer, calling fingerprints cryptographic execution attestation, describing authored fixtures as independent real-world validation, or quoting 97.8% without its denominator. Claiming the demo SQL cannot run outside demo mode is now directly contradicted by a live experiment. Claiming HALF_EVEN shows insufficient familiarity with both the calculator and its oracle.

The owner should be able to explain why UNKNOWN can be a correct label yet also represent an incorrect abstention, why high-confidence routing errors are dangerous, why an HTTP p95 improved during a worse payroll experience, and why a GitHub green job may contain gate WARN. These distinctions are central to the project, not optional trivia.

Some product failure behavior also warrants an honest answer. In `PayrollProcessor`, the catch block is inside the transaction callback. Database flush/commit exceptions can occur after that block, and a transaction marked rollback-only cannot reliably persist `run.fail()` in the same transaction. This is a source-supported recovery risk, **not independently fault-injected here**. There is no verified bounded retry/dead-letter/recovery contract. A strong interview answer would propose a small database-failure test and explicit recovery semantics rather than claim production-grade asynchronous processing.

# 24. Top 20 Interview Questions

1. Why is a modular monolith the right architecture for WorkforceOps, and what measured requirement would justify separating a service?
2. Which bugs do the real PostgreSQL/Testcontainers tests catch that H2 or mocked repositories would miss?
3. Walk through the leave reservation and approval locks. How do the two concurrency tests prove exactly-once consumption rather than merely two acceptable statuses?
4. How are role authorization and object ownership different, and which test demonstrates a horizontal BOLA attempt?
5. Why does the payroll oracle use HALF_UP, and which input would distinguish it from HALF_EVEN?
6. What happens if a database error occurs during payroll commit? Can the current worker persist FAILED, and how would you verify recovery?
7. How does the database immutability trigger interact with finalization and a concurrent direct SQL item writer?
8. Why are two E2E journeys sufficient, and which high-value checks belong below the browser layer?
9. What data accumulates if the browser/performance suites run repeatedly against one Compose volume, and how would you make isolation deterministic?
10. What does the 95.45% PIT score include, what survives, and why is PIT test strength a different number?
11. Why did slow payroll have a lower HTTP p95 while failing its business-completion threshold?
12. What evidence supports the 750 ms and 2,500 ms budgets, and why does a CI smoke run not measure production capacity?
13. Trace an unknown changed file through selection. Why does it broaden, and why is the current plan not used to skip CI tests?
14. What exactly is the denominator behind 100% critical recall and 75.9% reduction, and which errors can the current benchmark still call PASS?
15. Why can old copied JUnit reports pass the gate, and what producer evidence would close that gap without introducing unnecessary signing infrastructure?
16. What is the difference between GitHub workflow head SHA and the PR merge checkout SHA recorded in an artifact manifest?
17. How does a real Playwright failure reach Jaeger enrichment and triage today, and what schema boundaries currently break that path?
18. Why is the rule baseline 100% on development but 66.7% on holdout, and what do UNKNOWN coverage and product-defect recall tell you?
19. Why are the case-002 and case-004 diagnoses more dangerous than abstention, and how would you evaluate action safety beyond keyword regexes?
20. What does the patch validator actually guarantee, why can it accept `toBe(100)` → `toBeGreaterThan(0)`, and what prevents that advice from being applied automatically?

# 25. P0 / P1 / P2 / P3 Risk Register

Priority follows the requested **portfolio release** scale. P0 here means a current claim/boundary must be corrected before presenting the project as finished; it is not a claim of a deployed critical incident. Effort is conceptual S/M/L, not a time estimate.

| ID / Priority | Issue and evidence | Impact | Recommended correction | Effort |
| --- | --- | --- | --- | --- |
| R01 / P0 | Demo ADMIN login succeeded on fresh default-profile database | Known privileged account outside advertised demo boundary | Move demo provisioning out of common migrations; verify demo and non-demo startup contracts. | M |
| R02 / P0 | Copied old JUnit passes; missing release manifest returns successful WARN; eval commit mismatch accepted | Release evidence can belong to another execution | Require run provenance and suite-completion envelopes; reject mismatches and test recopy scenarios. | M |
| R03 / P0 | Patch validator approves changed/weakened assertions and mismatched production diff header | “Safe” result can encourage acceptance of a broken oracle | Restrict allowed edit surface and actual diff paths, or label output advisory; retain human review and counterexample tests. | M |
| R04 / P0 | README safety/rounding/mutation/complete-loop claims contradict code and reproduced results | Portfolio trust and interview defensibility | Reconcile current claims with this audit; label incomplete integrations and historical metrics explicitly. | S |
| R05 / P1 | Playwright bundle rejected by triage schema; enriched span summary stripped | Advertised diagnosis workflow cannot run as shown | Define one evidence contract and adapter; prove one captured failure reaches triage with trace evidence intact. | M |
| R06 / P1 | Documented OPENAI key fails; no request timeout; partial redaction; prompt fallback | Unreliable optional provider and unsafe evidence handling | Unify key/model configuration, bound requests, sanitize all outbound fields, reject missing prompt versions and expose comparison failures. | M |
| R07 / P1 | Two gate type errors omitted by CI; aggregator skipped after upstream failures | Green build misses a declared check and failed runs lose decision artifacts | Run workspace typechecks and execute aggregation/artifact capture on failure with correct job semantics. | S |
| R08 / P1 | Worker catch is inside transaction; commit/rollback recovery not tested | A failed job may remain PROCESSING and repeatedly retry without durable failure evidence | Fault-inject a database error in disposable tests, specify retry/FAILED behavior, persist recovery outside a doomed transaction if required. | M |
| R09 / P1 | Catalog excludes families/metadata; selector benchmark PASS ignores risk/component mismatch | Traceability and benchmark claims stronger than validation | Verify supported metadata bidirectionally, explicitly list exclusions, and fail contradictory benchmark expectations. | M |
| R10 / P1 | Browser finite payroll periods and persistent leave consumption | Repeat runs can collide or exhaust shared state | Introduce isolated/resettable run-owned data without globally weakening business assertions. | M |
| R11 / P1 | Current scheduled/manual nightly and release workflow not executed | Incomplete workflow verification claim | Run nonpublishing verification at the final candidate SHA when authorized; retain current status until then. | S |
| R12 / P2 | SQL immutability/direct writers and competing payroll finalization not directly tested | Strong database claims have less evidence than leave concurrency | Add targeted transactional integration scenarios for these existing invariants. | M |
| R13 / P2 | Manager existence accepted without approver role validation | Employee can be assigned an ineffective manager relationship | Clarify hierarchy rule and add one creation/approval contract test. | S |
| R14 / P2 | Tiny, jointly authored eval cases; questionable labels and fixed confidences | Accuracy/action-safety claims generalize poorly | Version label adjudication and a small set of independently collected failures; evaluate conflicting signals and routing correctness. | M |
| R15 / P2 | Runtime-only backend image and undocumented Maven packaging prerequisite | Clean build/up sequence fails | Make packaging part of the supported startup command or document/provide a reliable wrapper. | S |
| R16 / P2 | Unpaginated list queries, limited worker telemetry and no shipped dashboards | Reference scale/observability does not support production claims | Keep scale claims bounded; address measured query or diagnostic needs before expanding infrastructure. | M |
| R17 / P3 | Inconsistent naming, compressed Java formatting, redundant legacy files | Reviewability and maintenance friction | Format existing code, choose consistent project/component names, remove obsolete examples. | S |
| R18 / P3 | Mutable action/image tags, omitted workflow permissions/timeouts, broken swallowed chmod fallback | Reproducibility and maintenance debt | Pin intentionally, set minimal workflow defaults and remove/fix the unused fallback. | S |

# 26. Top Five Highest-ROI Next Actions

1. **Isolate demo provisioning and prove the boundary.** Fix the reproduced default-profile administrator account and add a fresh-start test for both profiles. This closes a concrete application risk and restores a basic promise before any presentation work or additional AI feature.
2. **Make release evidence belong to its producer run.** Require the manifest for release/nightly, capture per-suite run/commit metadata and reject copied or mismatched evidence. Include failure-path aggregation in CI. This repairs the project's most valuable differentiator; a new dashboard or larger suite would not address false release confidence.
3. **Reduce patch and AI safety claims to enforceable contracts.** Treat current output as advisory; restrict permitted patch changes, validate every real diff path, add the reproduced bypass cases, and centralize outbound redaction/request bounds. This improves trust more than trying another model or adding an autonomous repair loop.
4. **Complete one real failure diagnosis path.** Adapt an actual Playwright failure into the common schema, preserve trace summaries, fix root-span selection, and consume the resulting evidence in triage. Correct provider-key/prompt handling using local contract tests; keep live LLM capability unverified until a deliberate evaluation exists. One working path provides more portfolio value than additional disconnected agents.
5. **Close verification and documentation, then publish a bounded release.** Fix the two type errors, reconcile rounding/mutation/catalog/workload claims, remove hardcoded operational-looking examples, and verify the final candidate's nonpublishing workflows. Include the worker recovery test if asynchronous failure guarantees remain in the positioning. Record one concise demo and dated evidence package. This consolidates existing value instead of starting a new feature backlog.

# 27. Should We Stop Building?

**NO — these specific engineering gaps still materially weaken it.** Unconditional demo users, incomplete run provenance and false patch-safety assurances are more than cosmetic. Fix those bounded contracts and either complete or accurately narrow the failure-triage integration. A broad expansion of the product is unnecessary.

After the P0s and the targeted verification above, the appropriate sequence is **polish, merge, tag v1.0, make the repository public when the owner chooses, record a demo, and write a case study**. This audit does not authorize or perform those publication actions. Baseline capacity studies, more models, distributed services and dozens of additional UI scenarios are not prerequisites for a defensible senior QA portfolio.

The stopping condition is observable: a fresh non-demo start has no demo accounts; a copied old report cannot support a new release run; unsafe patch examples cannot be labeled safe; one advertised diagnostic path works or is explicitly marked incomplete; and the current README matches the final SHA's evidence. Once those conditions hold, diminishing-return feature work should stop.

# 28. Final Portfolio Positioning

“I built SentinelQA, a Quality Engineering reference platform around a workforce application, combining business-invariant tests, PostgreSQL concurrency and authorization checks, critical browser journeys, mutation testing and performance regression gates. It produces explainable change-impact test plans and quality-evidence summaries, with live request tracing and an evaluated deterministic failure-triage baseline. LLM integration and patch checks are advisory experiments with explicit limitations; test execution and release judgment remain under deterministic and human control.”

This wording is suitable for a CV, LinkedIn or GitHub overview today if accompanied by the current limitations. Do not add autonomous healing, production capacity, universal assertion safety, complete run attestation or validated LLM diagnosis until those specific claims have evidence.

# 29. Final Interview Pitch

“SentinelQA is a Quality Engineering reference project built around a small workforce application. I chose leave approval and payroll because they create meaningful risks: unauthorized access, double consumption of leave, duplicate finalization and incorrect money calculations.

“The application is a modular monolith. Pure policy tests cover boundary rules, while Testcontainers runs PostgreSQL integration tests for real HTTP, transactions and concurrent requests. Two Playwright journeys verify the critical user flows. PIT helps assess whether the policy assertions detect faults, and k6 measures both HTTP requests and how long payroll actually takes to complete. A controlled slowdown demonstrated why that distinction matters: requests stayed fast while payroll violated its completion budget and the gate blocked.

“The tooling also recommends tests from changed components and summarizes execution evidence. CI still runs the mandatory suites. Failure triage starts with deterministic rules; the authored holdout scored about 67%, including two confident mistakes, so I treat diagnosis as advice. The independent audit exposed provenance, demo-seed and patch-validation gaps. I would rather explain and close those boundaries than call the system autonomous or production-proven.”
