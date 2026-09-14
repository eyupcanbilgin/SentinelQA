# SentinelQE Controlled Defect Seeds

SentinelQE provides controlled defect injection to reproducibly demonstrate that the automated quality engineering system detects realistic defects, generates diagnostic evidence, and triggers quality gates.

## Safety Rule: Off by Default
All defect seeds are **strictly disabled by default** in standard builds and CI pipelines.
Normal mode execution is 100% defect-free.

To prevent accidental activation in production:
1. Defect seeds require the explicit Spring profile: `--spring.profiles.active=demo`.
2. Defect seeds require `--app.defects.enabled=true`.
3. If defect flags are passed without the `demo` profile, `io.sentinelqe.workforce.common.DefectSeeds` immediately aborts startup with:
   `IllegalStateException("Defect seeds require the explicit demo profile")`.

---

## Catalog of Controlled Defect Seeds

### 1. Double Finalization Bug (`DEFECT_SEED_DOUBLE_FINALIZE`)
- **Flag**: `--app.defects.double-finalize=true`
- **What is broken**: Disables the domain invariant check in `PayrollPolicy`, allowing an already finalized payroll run to be finalized a second time.
- **Why it matters**: Financial and audit integrity violation. In real systems, double finalization can cause duplicate ledger postings or duplicate bank disbursements.
- **Target Automated Test**: `API-PAY-005` (`rejectDoubleFinalize`)
- **Observed Evidence**:
  - `API-PAY-005` fails: Server returns HTTP 200 instead of HTTP 409 Conflict.
  - Triage classification: `PRODUCT_DEFECT` (high confidence).
  - Quality gate decision: `BLOCK`.

### 2. Slow Payroll Calculation (`DEFECT_SEED_SLOW_PAYROLL`)
- **Flag**: `--app.defects.slow-payroll=true`
- **What is broken**: Injects an artificial 2500ms delay per payroll item batch calculation in `PayrollService`.
- **Why it matters**: Degrades asynchronous queue throughput and causes SLA/SLO violations on monthly payroll batch completion.
- **Target Automated Test**: `PERF-PAY-001` (k6 asynchronous performance scenario)
- **Observed Evidence**:
  - k6 threshold breach: `http_req_duration p(95)` exceeds 750ms threshold.
  - Triage classification: `ENVIRONMENT` / `PRODUCT_DEFECT`.
  - Quality gate decision: `BLOCK`.

### 3. Incorrect Tax Calculation (`DEFECT_SEED_WRONG_TAX`)
- **Flag**: `--app.defects.wrong-tax=true`
- **What is broken**: Modifies the tax calculation formula in `PayrollCalculator`, deducting 15% instead of the documented deterministic 20% flat tax.
- **Why it matters**: Regulatory tax underwithholding and net pay calculation errors.
- **Target Automated Test**: `UNIT-PAY-001` and PIT mutation testing.
- **Observed Evidence**:
  - `UNIT-PAY-001` fails: Net pay and tax assertions fail with cent discrepancies.
  - PIT mutation testing detects mutant survival or killed regression.
  - Quality gate decision: `BLOCK`.

### 4. Manager Approval Bypass (`DEFECT_SEED_BYPASS_MANAGER`)
- **Flag**: `--app.defects.bypass-manager-check=true`
- **What is broken**: Relaxes `AccessPolicy` to permit managers to approve leave requests for employees outside their department/direct-report hierarchy.
- **Why it matters**: Broken Object-Level Authorization (BOLA / IDOR) allowing unauthorized managerial action.
- **Target Automated Test**: `API-LEAVE-004` and `SEC-AUTHZ-003`.
- **Observed Evidence**:
  - `SEC-AUTHZ-003` fails: Unauthorized manager receives HTTP 200 instead of HTTP 403 Forbidden.
  - Triage classification: `PRODUCT_DEFECT`.
  - Quality gate decision: `BLOCK`.

---

## Reproducing a Defect Seed Demonstration
To activate a defect seed for testing or live portfolio demonstration:

```bash
# Example: Activate double finalization bug in local demo mode
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo -Dspring-boot.run.arguments="--app.defects.enabled=true --app.defects.double-finalize=true"
```

Then run the targeted suite:
```bash
# Run test selector to confirm targeted suite
npm run quality:select-tests -- --changed backend/src/main/java/io/sentinelqe/workforce/payroll/PayrollService.java

# Run triage assistant on the collected failure
npm run quality:triage -- agent-evals/datasets/failure-triage/ft-001-product-defect.json
```
