# WorkforceOps frontend

React, TypeScript and Vite provide a small, accessible client for the modular monolith. There is no component framework or client-side business rules engine. Money arrives as decimal strings and is formatted without numeric conversion; payroll calculations belong to the backend.

From the repository root, run `npm ci`, then `npm run dev --workspace @sentinel-qe/frontend`. Open http://localhost:5173. Vite proxies `/api` to http://localhost:8080 (override with `BACKEND_URL`). Start the backend with the `demo` profile for the fictional demo accounts documented in the root README. A production build is `npm run build --workspace @sentinel-qe/frontend`.

Authentication is intentionally in memory: refresh signs the user out. This avoids retaining bearer tokens in persistent browser storage. Server-side authorization remains authoritative; role-gated UI actions are a usability aid. A 401 ends the local session, and failures show a request correlation ID. No token or password is logged by the application.

Payroll polling runs only while processing and cleans up on navigation. Users can refresh manually after a connection failure. Labels, table captions via accessible names, status messages, visible keyboard focus, and native forms provide browser test interaction points without proprietary selector attributes.

Browser tests live in `tests/e2e`. The build step includes a strict TypeScript check. The current interface covers profile views, leave requests and approvals, balances, and admin payroll; account provisioning and editable employee profiles are API-only or outside this reference UI.
