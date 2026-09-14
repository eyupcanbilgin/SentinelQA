# SentinelQA Observability-Driven Triage Demo

This executable demonstration proves the closed-loop capability:
```
test failure → correlation ID → backend Jaeger trace → normalized failure bundle → evidence-backed triage
```

Rather than treating test failures as opaque console errors, SentinelQA correlates failure events directly with distributed traces across the Spring Boot backend, PostgreSQL, and background worker queues.

---

## Architecture of the Observability Loop

```
┌─────────────────┐       X-Correlation-ID       ┌────────────────────────┐
│  Test Runner    │ ───────────────────────────> │  WorkforceOps Backend  │
│ (Playwright/IT) │                              │   (OpenTelemetry)      │
└────────┬────────┘                              └───────────┬────────────┘
         │                                                   │ OTLP / gRPC
         │ On failure: capture response headers              ▼
         │ & correlation ID                       ┌────────────────────────┐
         │                                        │  OTel Collector        │
         ▼                                        └───────────┬────────────┘
┌────────────────────────┐                                   │
│ Failure Evidence       │                                   ▼
│ Enricher               │ <────────────────────── ┌────────────────────────┐
│ (evidence-enrichment/) │   Trace & Span lookup   │  Jaeger Tracing        │
└────────┬───────────────┘   via REST Query API    │  (:16686)              │
         │                                         └────────────────────────┘
         ▼
┌────────────────────────┐
│ Normalized Enriched    │ ───> [Triage Assistant: Rules or LLM]
│ Evidence (Redacted)    │      Root cause pinpointed to failing span
└────────────────────────┘
```

---

## Step-by-Step Executable Demo

### Step 1: Start the Platform with Observability Stack
Start PostgreSQL, backend, frontend, OpenTelemetry Collector, and Jaeger in demo mode:

```bash
docker compose --profile observability up -d --build --wait
```

Verify services are healthy:
- WorkforceOps Backend: `http://localhost:8080/actuator/health`
- Jaeger UI: `http://localhost:16686`
- Prometheus: `http://localhost:9090`

### Step 2: Trigger a Trace-Generating Request
Send an authenticated request containing an explicit `X-Correlation-ID` header:

```bash
# Obtain an authentication token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.test","password":"LocalDemo!2026"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Create and process a payroll run with a unique correlation ID
CORRELATION_ID="demo-trace-$(date +%s)"
echo "Generated Correlation ID: ${CORRELATION_ID}"

RUN_ID=$(curl -s -X POST http://localhost:8080/api/payroll-runs \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: ${CORRELATION_ID}" \
  -d '{"period":"2032-01"}' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# Queue processing for the run
curl -s -X POST "http://localhost:8080/api/payroll-runs/${RUN_ID}/process" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Correlation-ID: ${CORRELATION_ID}"
```

### Step 3: Verify Telemetry in Jaeger
Query the Jaeger REST API to confirm trace collection:

```bash
curl -s "http://localhost:16686/api/traces?service=workforceops&tags=%7B%22correlationId%22%3A%22${CORRELATION_ID}%22%7D" | jq .
```

### Step 4: Enrich Failure Evidence Bundle
Given a test failure evidence artifact containing this `correlationId`:

```json
{
  "schemaVersion": "1.0",
  "testId": "API-PAY-003",
  "testName": "asyncPayrollProcessing",
  "layer": "api",
  "component": "payroll",
  "errorMessage": "Payroll processing SLA breached: run remained in PROCESSING state beyond deadline",
  "correlationId": "demo-trace-1726308000",
  "httpStatus": 202
}
```

Run the evidence enricher to fetch telemetry and redact credentials:

```bash
npm run quality:enrich-evidence -- reports/failures/sample-failure.json --output reports/failures/enriched-failure.json
```

Output:
```text
Enriching evidence for test: API-PAY-003 (correlationId: demo-trace-1726308000)
✅ Retrieved trace 4a82b9c1d092 from Jaeger (4 spans)
   Root span: POST /api/payroll-runs/{id}/process (duration: 3820ms)
🔒 Redacted 0 sensitive token/credential match(es).
Enriched evidence saved to: reports/failures/enriched-failure.json
```

### Step 5: Run Failure Triage on Enriched Evidence
Execute the triage engine with the enriched evidence:

```bash
npm run quality:triage -- reports/failures/enriched-failure.json
```

The triage assistant outputs a schema-validated classification:
- Classification: `PRODUCT_DEFECT` or `ENVIRONMENT`
- Confidence: `0.91`
- Evidence: Includes exact Jaeger trace ID, failing span name, span duration, and HTTP status code.
- Recommended Owner: `backend`
- Recommended Next Action: "Inspect correlated backend logs and trace IDs around timestamp; patch domain service logic."

---

## Security Boundary: Credential Redaction & Log Bounds
The evidence enricher guarantees:
1. **Zero Token Leaks**: All `Bearer [JWT]` strings are replaced with `[REDACTED_JWT]`.
2. **Password Sanitization**: `password=...` and `"password": "..."` values are sanitized to `[REDACTED]`.
3. **Payload Truncation**: No unbounded stack traces or application logs are forwarded to external LLMs. Max string length is bounded at 4KB.
4. **Prompt Injection Guard**: Logs containing prompt injection attacks (e.g. `Ignore system prompt...`) are treated as untrusted data strings.
