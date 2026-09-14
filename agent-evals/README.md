# SentinelQE Agent Evaluation Suite

SentinelQE evaluates AI quality assistance against curated, labeled golden datasets before any model output is trusted in CI or release gates.

## Philosophy: Evaluated, Guarded AI Assistance
AI quality tooling must never be treated as an infallible oracle. In SentinelQE:
1. **Zero-Cost Deterministic Baseline**: All CI pipelines and developer workflows run with the deterministic `MockAiProvider`, guaranteeing 100% reproducible results with no API keys or paid third-party dependencies.
2. **Schema Enforcement**: Outputs are validated through strict Zod schemas (`TriageResultSchema`), rejecting free-form text or unparseable hallucinations.
3. **Probabilistic Framing**: AI outputs explicitly state uncertainty and provide human review disclaimers (`"AI-assisted triage suggests..."`).
4. **Golden Dataset Benchmarking**: Agent performance is quantified with standard machine learning metrics (Accuracy, Precision, Recall, Macro F1, Confusion Matrix).

## Dataset Composition (`datasets/failure-triage/`)
The golden dataset consists of 25 carefully curated, realistic failure bundles representing the 6 core failure categories:
- `PRODUCT_DEFECT` (6 fixtures): Domain invariant breaches (double finalization, tax calculation rounding discrepancy, leave balance underflow, null pointer in business logic).
- `TEST_DEFECT` (5 fixtures): Outdated locators, Playwright strict-mode locator ambiguities, assertion type mismatches, stale error message expectations.
- `ENVIRONMENT` (5 fixtures): PostgreSQL connection refused, Nginx 502 Bad Gateway, Docker OOMKilled, database connection pool timeouts, DNS unresolvable.
- `TEST_DATA` (4 fixtures): Unique constraint collisions on emails or payroll periods, foreign key violations from missing seed departments, missing fixture entities.
- `FLAKY_TEST` (3 fixtures): Intermittent animation timing failures, asynchronous race conditions resolved on retry, transient websocket drops.
- `UNKNOWN` (2 fixtures): Truncated diagnostic logs without stack traces or HTTP status codes.

## Running Evaluations
```bash
npm run agent-evals
```

## Generated Reports
- Machine-readable: `reports/agent-evals/triage-summary.json` (consumed directly by the SentinelQE Quality Gate aggregator)
- Human-readable: `reports/agent-evals/triage-summary.md`

## Prompt Regression Testing
Prompt templates are versioned under `quality-intelligence/prompts/failure-triage/` (`v1.md`, `v2.md`). When prompt wording is refined, running `npm run agent-evals` immediately surfaces whether classification accuracy or per-class recall improved or regressed against the golden dataset.
