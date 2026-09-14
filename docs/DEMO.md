# SentinelQE Portfolio Demonstration Guide

This guide details an interactive, 5 to 10 minute live walkthrough showcasing SentinelQE's core quality engineering architecture, risk-aware test selection, observability correlation, evaluated AI assistance, controlled defect injection, and release gating.

---

## Demo Scenario 1: Low-Risk Change & Targeted Selection

### Narrative
A frontend engineer updates an informational text string on an uncritical view. Running the entire test portfolio for minor copy changes wastes developer time and CI compute. SentinelQE's deterministic test selection safely scopes execution.

### Execution
```bash
# 1. Run test selection for a UI-only path
npm run quality:select-tests -- --changed frontend/src/components.tsx
```

### Observation
- **Risk Level**: Evaluated as `LOW` (Impact: 1, Likelihood: 1).
- **Selection Decision**: Selects targeted UI component tests and critical smoke baselines (`always` tags).
- **Safety Fallback**: Does not trigger full catalog broadening because the change is isolated to a mapped leaf path.

---

## Demo Scenario 2: High-Risk Payroll Change & Broadening

### Narrative
An engineer modifies the core financial payroll service (`PayrollService.java`). Because financial calculations directly impact employee compensation and regulatory reporting, the system flags the change as high-risk and broadens coverage.

### Execution
```bash
# 1. Run test selection for payroll core logic
npm run quality:select-tests -- --changed backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollService.java
```

### Observation
- **Risk Level**: Evaluated as `HIGH` (Score: 25/25).
- **Affected Components**: `payroll`, `financial-calculation`.
- **Recommended Suites**:
  - Domain Unit Tests (`UNIT-PAY-001` through `007`)
  - Integration Tests with real PostgreSQL (`INT-PAY-001` through `005`)
  - API Workflow Tests (`API-PAY-001` through `005`)
  - PIT Mutation Testing (`mutation` profile)

---

## Demo Scenario 3: Reproducible Defect Detection & Failure Triage

### Narrative
We demonstrate that SentinelQE's quality system detects real regressions, extracts structured failure evidence, and assists engineers with diagnostic triage.

### Execution
```bash
# 1. Inspect the controlled defect seed for double finalization
# (Documents why double finalization is dangerous and what test catches it)
cat defect-seeds/README.md

# 2. Run the Failure Triage Assistant on the recorded failure bundle
npm run quality:triage -- agent-evals/datasets/failure-triage/ft-001-product-defect.json
```

### Observation
- **Classification**: `PRODUCT_DEFECT` (Confidence: 91.0%).
- **Suspected Component**: `payroll`.
- **Recommended Owner**: `backend`.
- **Evidence Surfaced**:
  - `Expected HTTP 409 but received HTTP 500 with DomainException: Business invariant violated`
  - `Correlation ID: req-corr-pay-005`
  - Stack trace pointing directly to `PayrollService.java:112`.
- **AI Guardrail**: Triage assistant outputs explicit uncertainty disclaimer and probabilistic recommendation.

---

## Demo Scenario 4: Agent Evaluation Benchmark & Golden Dataset

### Narrative
Rather than blindly trusting AI prompts, SentinelQE treats AI quality tools as machine learning models requiring continuous evaluation against labeled benchmark datasets.

### Execution
```bash
# 1. Execute the agent evaluation suite against the 25 labeled golden fixtures
npm run agent-evals
```

### Observation
- **Dataset**: 25 realistic fixtures across all 6 categories (`PRODUCT_DEFECT`, `TEST_DEFECT`, `ENVIRONMENT`, `TEST_DATA`, `FLAKY_TEST`, `UNKNOWN`).
- **Metrics Calculated**:
  - Overall Accuracy (must satisfy >= 85.0% threshold)
  - Precision, Recall, and F1 Score per class
  - Macro F1 Score
  - UNKNOWN rate
  - Confusion Matrix
- **Generated Reports**:
  - Machine-readable: `reports/agent-evals/triage-summary.json`
  - Human-readable: `reports/agent-evals/triage-summary.md`

---

## Demo Scenario 5: Quality Gate Release Decision

### Narrative
The release decision is not made by guesswork or passing unit tests alone. The SentinelQE Quality Gate aggregates evidence from all layers (Unit, Integration, Security, E2E, Performance, Mutation, AI Evals) and distinguishes verified evidence from missing or stale reports.

### Execution
```bash
# 1. Run the quality gate aggregator
npm run quality:gate -- --profile pr
```

### Observation
- **Missing Evidence Handling**: Missing integration and E2E reports are marked `NOT_RUN MISSING`, never assumed PASS.
- **Verified Sources**: `unit` (90/90 passed), `mutation` (98% killed), and `agentEvals` (100% accuracy) are validated with cryptographic SHA-256 provenance and modification timestamps.
- **Decision**: `INSUFFICIENT_EVIDENCE` (Blocks premature release until all mandatory quality evidence is supplied).
- **Outputs**: `reports/quality-gate.json` and `reports/quality-gate.md`.
