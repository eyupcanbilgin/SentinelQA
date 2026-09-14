# WorkforceOps integration contract

Backend: port 8080. Frontend: port 5173 locally, port 3000 in Compose. JSON throughout. API paths are relative to the same origin in the frontend (Vite/nginx proxy). Development accounts use password `LocalDemo!2026` and are enabled only with the `demo` profile.

IDs are UUID strings. Seed employees: employee1 `00000000-0000-0000-0000-000000000001`, employee2 `00000000-0000-0000-0000-000000000002`, manager `00000000-0000-0000-0000-000000000003`, HR `00000000-0000-0000-0000-000000000004`, admin `00000000-0000-0000-0000-000000000005`. employee1 reports to manager; employee2 belongs to a different department and is not this manager's report. Department IDs end in 101 and 102. Seed balances: 20 calendar days per employee. Accounts: employee1@example.test, employee2@example.test, manager@example.test, hr@example.test, admin@example.test.

| Method / path | Request | Response / policy |
| --- | --- | --- |
| POST /api/auth/login | {email,password} | {token,role,employeeId,name}; JWT bearer |
| GET /api/employees | | Employee[]; own/direct reports for employee/manager, all HR/ADMIN |
| GET /api/employees/{id} | | Employee; forbidden object returns 403 with no confidential fields |
| POST /api/employees | {name,email,departmentId,managerId?,baseSalary} | Employee, 201; ADMIN only; creates employee record, not a login account |
| GET /api/departments | | {id,name}[] |
| GET /api/leave-balances/me | | {employeeId,availableDays} |
| GET /api/leave-requests | | LeaveRequest[]; own, managed or all depending on role |
| POST /api/leave-requests | {startDate,endDate,reason} | LeaveRequest, 201; always own employee |
| GET /api/leave-requests/{id} | | LeaveRequest, object authorization |
| POST /api/leave-requests/{id}/manager-approve | empty | LeaveRequest; direct manager, no self approval |
| POST /api/leave-requests/{id}/hr-approve | empty | LeaveRequest; HR/ADMIN after manager approval, no self approval |
| POST /api/leave-requests/{id}/reject | empty | LeaveRequest; authorized current approver, no self decision |
| GET /api/payroll-runs | | PayrollRun[]; ADMIN only |
| POST /api/payroll-runs | {period:"YYYY-MM"} | PayrollRun, 201; ADMIN |
| GET /api/payroll-runs/{id} | | PayrollRun including items; ADMIN |
| POST /api/payroll-runs/{id}/process | empty | PayrollRun, 202; queued DB state, async worker |
| POST /api/payroll-runs/{id}/finalize | empty | PayrollRun; completed only; repeated finalization 409 |
| GET /api/audit-events | | audit events; ADMIN only |

Employee: `{id,name,email,departmentId,managerId,active,baseSalary}`. LeaveRequest: `{id,employeeId,employeeName,startDate,endDate,days,reason,status}`. PayrollRun: `{id,period,status,totalNet,items:[{id,employeeId,baseSalary,tax,deductions,netPay}]}`. Money is returned as decimal JSON strings to avoid client floating-point calculations. Date ranges are inclusive calendar days, deliberately excluding holiday/accrual logic. Pending requests reserve balance through transactional checks; final approval decrements actual balance exactly once. Payroll tax is flat 20%, deductions 5%, each rounded HALF_UP to 2 decimals; net = base - tax - deductions.

Errors: `{code,message,correlationId}`; validation 400, bad/missing token 401, forbidden 403, not found 404, business conflicts 409. No stack traces in responses. `X-Correlation-ID` echoed with bounded/sanitized values. OpenAPI `/v3/api-docs`, Swagger `/swagger-ui/index.html`; health `/actuator/health`; Prometheus `/actuator/prometheus` on local reference platform.

Tests use stable IDs in display names/titles. Java package root `io.sentinelqe.workforce`. Maven unit tests `*Test`, DB/API tests `*IT` (Failsafe under `integration` profile). Integration tests use actual PostgreSQL, with an explicit external local PostgreSQL option if Testcontainers cannot run; never H2. Native/API tests must isolate their mutable data. Playwright has zero blanket retries and one worker for shared demo journeys; leaves use unique future dates and restore balance via a fresh Compose DB between whole runs, documented explicitly.
