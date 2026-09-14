# Critical browser journeys

These tests exercise real WorkforceOps browser/API/database workflows. They do not mock the product API. One Chromium project and one worker share the documented fictional demo accounts; there are no blanket retries, fixed sleeps, or ordering dependencies. Each test signs in through the UI and keeps bearer tokens in memory. Storage-state files are unnecessary because the app deliberately does not persist login tokens.

From the repository root:

```sh
npm ci
npx playwright install chromium
docker compose up -d --build --wait
npm run test:e2e
```

The default frontend is http://localhost:3000. For a local Vite server use `E2E_BASE_URL=http://localhost:5173`. `E2E_DEMO_PASSWORD` overrides the local demo password; never run against production. Verify backend health before starting the browser suite. Compose's `--wait` provides a readiness barrier.

Tests consume two days of employee1's balance and create a payroll period. Start each **complete suite run** from a fresh disposable Compose database using the documented reset command in the root README. No test depends on another test's data. Leave reasons have unique IDs. Defaults are `E2E_LEAVE_START=2035-04-12` (two inclusive calendar days) and `E2E_PAYROLL_PERIOD=2035-04`; both can be overridden for a controlled repeat against an existing database that still has adequate balance. Tests never bypass production authorization or silently delete domain records to reset invariants.

`E2E-LEAVE-001` follows employee → manager → HR → employee and asserts final state and exact balance change. `E2E-PAY-001` checks role-gated controls, accepted asynchronous processing, rendered items, integer-cent monetary reconciliation, and item immutability after finalization. Invalid access and repeated commands are covered at the API layer instead of duplicating all permutations in a browser.

Reports are written to `reports/playwright/results.json`, `junit.xml`, `html/`, and `test-results/`. Failed tests attach `failure-evidence.json`: stable test ID, expected state, sanitized actual page text, recent API routes/statuses/correlation IDs, console errors, screenshot path, and a backend-log lookup reference. Missing backend traces/logs are explicitly identified. No request bodies, headers, query strings, passwords or bearer tokens are intentionally added to normalized diagnostics. The evidence remains untrusted data; redaction is defense in depth, not permission to collect real secrets.

Retained **raw Playwright traces can contain authentication headers and request bodies**, despite normalized evidence redaction. Keep raw traces/screenshots restricted to the disposable demonstration environment with short CI retention; do not feed them to an external AI provider. Normalized evidence is the triage input boundary. Video is disabled because trace and screenshot evidence cover these short form workflows without larger recordings.

Run `npm run typecheck --workspace tests/e2e` and `npm run test:list --workspace tests/e2e` to verify compile-time contracts and discover tests without claiming browser execution. Playwright's locator assertions and server-status polling provide synchronization; the suite does not use `waitForTimeout`.
