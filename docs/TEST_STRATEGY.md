# Test strategy

The release question is whether WorkforceOps still protects employee data, accounts for leave exactly once and produces immutable, deterministic payroll. Test count and green status alone cannot answer it. The portfolio combines cheap domain checks, real PostgreSQL workflows, a few browser journeys and evidence-based gates.

| Risk / invariant | Primary checks | Accountable owner |
| --- | --- | --- |
| Salary or leave data disclosed to another employee | REST Assured object/role authorization; deny responses inspected for confidential fields | Backend/security reviewer |
| Concurrent leave requests overspend entitlement | Domain arithmetic plus real PostgreSQL reservation/locking checks | Backend module owner |
| Replayed approval consumes leave twice | API workflow verifies state, balance and conflict response | Backend module owner with QE review |
| Payroll amount or immutable state is wrong | Decimal calculator unit tests, async API/DB workflow, PIT sensitivity | Payroll owner |
| Users cannot complete approvals or payroll | Focused Playwright role-to-role journeys | Frontend owner with QE review |
| A fast `202` hides slow payroll processing | k6 request and completion measurements | Platform/performance owner |
| AI advice skips risk or misroutes investigation | Deterministic selection tests, labeled triage evals, guardrail rejection tests | Quality-tooling owner |
| Missing reports create false confidence | Quality-gate parser/policy tests with malformed and absent artifacts | CI/platform owner |

Ownership describes responsibilities, not separate teams. The contributor changing a rule updates its implementation, contract, primary tests and catalog mapping in the same PR. QE reviews cross-module invariants and evidence quality. A release owner reviews residual risk and missing evidence.

Unit tests own pure calendar duration, balance decisions, decimal rounding and state transitions. Integration tests own migrations, real PostgreSQL constraints, transaction behavior and service/database effects. Java REST Assured tests exercise the deployed HTTP security and workflow contracts within the integration profile. Browser tests own the minimum user-visible leave approval and admin payroll paths; they do not repeat the full API negative matrix. Performance and mutation tests ask distinct questions about workload behavior and sensitivity to defects.

Java unit tests use `*Test`; database/API tests use `*IT` under the Maven `integration` profile. Important tests include stable IDs in display names or browser titles. The [test catalog](../quality/test-catalog.yml), [requirements](../quality/requirements.yml) and component map make selection and traceability inspectable. Metadata is maintained alongside executable tests, not accepted as proof a test ran.

| Trigger | Execution policy | Evidence expectation |
| --- | --- | --- |
| Pull request | Backend build/unit/integration/API security, frontend build, critical Playwright, deterministic tooling/gate tests and agent eval; analyze changed paths | Actual JUnit, browser JSON/HTML, selection report, eval report and gate output. Heavy performance/mutation may be absent and must appear `NOT_RUN`. |
| Nightly | Full critical regression plus PIT and larger k6 workload; deterministic evals; inspect flaky-history signals where available | All required layer artifacts; investigate failures against the commit/run that produced them. |
| Manual/release | Critical functional/security regression, release performance and mutation evidence, complete gate summary | All required evidence from the candidate run. Human review remains necessary. |

Workflow YAML is the executable schedule; the gate's [README](../quality-gate/README.md) defines its report contracts. Selection currently provides explanations and recommended IDs. Required PR checks form a floor even when only a low-risk file changes. An unmapped file, missing git comparison or uncertain component mapping broadens selection. Test-selection false negatives are costlier than an extra suite.

Environments use PostgreSQL with Flyway and container readiness checks. Testcontainers is the default integration path; an explicit dedicated external PostgreSQL fallback is allowed locally and reported separately. The optional observability profile supplies traces and metrics without burdening every unit-test run. See [TEST_DATA_STRATEGY.md](TEST_DATA_STRATEGY.md) for isolation, demo data and the browser database lifecycle.

There are no blanket Playwright retries. Investigate intermittent results as product race, synchronization, environment, data collision or nondeterministic assertion. Preserve the first failure's test ID, correlation ID, error, network status, screenshot and trace. A manually repeated pass is additional evidence, not grounds to erase the failure. Quarantine requires a named owner, issue, expiry and replacement protection for the risk; the AI tooling cannot quarantine or skip tests. A single failure never establishes that a test is flaky.

Performance thresholds express expectations for the documented local reference workload. They must distinguish HTTP acknowledgement latency from payroll completion and report workload/environment parameters. Larger load/stress runs belong to scheduled/manual execution; shared CI runner variance must be visible in interpretation. No local result establishes production user capacity. See [PERFORMANCE_STRATEGY.md](PERFORMANCE_STRATEGY.md).

PIT targets meaningful domain behavior. A surviving mutant is investigated for a missing assertion, unreachable/equivalent mutation or scope mismatch. Do not write tests that merely restate implementation to inflate a score. The configured mutation threshold is a policy, not a published achieved result; record reports and any accepted exclusions explicitly.

AI evaluation separates deterministic fixture performance from model performance. The mock baseline tests schemas, routing, thresholds, reports and regressions in rules. Optional real-provider results must record provider/model, prompt version, dataset version and execution configuration. Accuracy, per-class precision/recall/F1, confusion matrix and UNKNOWN rate need enough context to interpret; curated synthetic evidence does not establish production root-cause accuracy. See [AI_GUARDRAILS.md](AI_GUARDRAILS.md).

Exit criteria are zero critical functional/security failures, complete expected test IDs, successful builds and the required evidence for the chosen gate profile. PR policy requires unit, integration, explicit security checks, critical E2E and agent evaluations. Missing optional performance/PIT evidence produces `NOT_RUN` and a warning, never a pass for those layers. Nightly/release requires all layers. Reports must be valid, nonempty, finite and fresh; a run manifest further binds artifacts to the current run. Failed thresholds block; missing required evidence is insufficient. A gate pass means available evidence satisfies configured criteria, not that every possible defect is excluded.

Actual commands and outcomes are maintained in [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md), with report references in [EVIDENCE.md](EVIDENCE.md). Anything that could not execute is `NOT VERIFIED`; authored tests and workflow files are not execution results.
