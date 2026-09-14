# Security-oriented QA

The primary security risk is exposing employee or payroll data across role and object boundaries. Tests exercise server-side policy with real tokens and actual employee relationships. This document is a validation scope, not a penetration-test attestation. Execution outcomes belong in [FINAL_VERIFICATION.md](FINAL_VERIFICATION.md).

The application is a single-organization reference service. An authenticated user has one role and an employee identity. Role does not confer self-approval. The API deliberately returns `403` for a known but forbidden employee or leave object; errors must contain only `code`, `message` and `correlationId`, never the target's salary, email, leave reason or stack trace.

| Action | EMPLOYEE | MANAGER | HR | ADMIN |
| --- | --- | --- | --- | --- |
| Read own employee record / balance | Yes | Yes | Yes | Yes |
| List/read employee records | Own only | Own and direct reports | All | All |
| Read departments | Yes | Yes | Yes | Yes |
| Create employee record | No | No | No | Yes |
| Create leave | Own, active employee | Own, active employee | Own, active employee | Own, active employee |
| List/read leave | Own only | Own and managed employees | All | All |
| Manager-stage approval | No | Direct report; never self | No | No |
| HR-stage approval | No | No | `PENDING_HR`; never self | `PENDING_HR`; never self |
| Reject leave | No | Direct report at manager stage | At HR stage; never self | At HR stage; never self |
| List/create/read/process/finalize payroll | No | No | No | Yes |
| Read audit events | No | No | No | Yes |

Final decisions cannot be replayed to alter balance. State authorization matters as well as role authorization: an HR token cannot skip a required manager stage, and a manager token cannot decide an already finalized request. Employees with no manager begin at `PENDING_HR`; this is an explicit workflow rule, not an authorization bypass. Rejection is restricted to the current authorized approver. Elevated access never implies permission to rewrite payroll items after finalization.

The critical authorization suite covers employee1 reading their own profile and being denied employee2's profile; the denial is inspected for confidential fields. The manager reads employee1 but is denied employee2 despite both being valid employees. Employee and HR credentials cannot invoke ADMIN payroll operations. Negative tests authenticate successfully first, so a `403` proves an authorization decision instead of an accidental login failure. The stable security IDs in [test-catalog.yml](../quality/test-catalog.yml) connect these checks to the release gate.

Authentication checks cover valid credentials, invalid password, missing bearer token, tampered token and expiry. Error tests assert a consistent shape and correlation ID without disclosing implementation details. Input checks exercise malformed dates/periods, invalid UUIDs, reversed leave dates, invalid salary and missing required fields. Database tests complement these with foreign keys, unique periods and transaction consistency.

Development accounts are enabled only by the `demo` profile. Real JWT secrets and optional model API keys must be supplied through environment configuration and excluded from version control. Do not reuse the example credentials or deploy the demo profile for real HR data. The reference metrics/OpenAPI endpoints are useful locally; their exposure must be reviewed before hosting this application outside the local demonstration environment.

Dependency hygiene consists of locked dependency versions, reproducible clean installs/builds and review of dependency updates. A successful build does not establish the absence of known vulnerabilities. The project does not claim a completed dependency audit, dynamic penetration test, rate-limit exercise, tenant-isolation audit or production identity review unless a named report records that execution.

Defect flags intentionally violate selected rules to demonstrate detection. They are off by default and belong only in a disposable local demo/test environment. Capture the exact seed, test ID and failure evidence; never treat a run with enabled seeds as release evidence. See [defect-seeds/README.md](../defect-seeds/README.md).
