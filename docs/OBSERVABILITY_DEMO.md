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
Query the Jaeger REST API to confirm trace collection using the canonical `correlation.id` tag (or fallback `correlationId`):

```bash
curl -s "http://localhost:16686/api/traces?service=workforceops&tags=%7B%22correlation.id%22%3A%22${CORRELATION_ID}%22%7D" | jq .
```

### Step 4: Automated Live Observability Verification
SentinelQA provides a standalone verification script that authenticates, executes a correlated request, polls Jaeger, verifies span attributes, enriches failure evidence, and produces machine-readable proof:

```bash
npm run test:observability
```

Verified Execution Output:
```text
=== SentinelQA Live Observability & Jaeger Round-Trip Verification ===
Backend URL: http://localhost:8080
Jaeger URL:  http://localhost:16686

Services verified healthy.
1. Authenticating as employee1@example.test...
2. Sending HTTP request with X-Correlation-ID: corr-verify-1789383210899...
   Response 200 OK. Backend confirmed X-Correlation-ID: corr-verify-1789383210899
3. Polling Jaeger for span with correlation.id...
   Trace found on attempt 5! Trace ID: 57388165580c55ba641bedc146bad4b3
4. Executing Evidence Enricher against live Jaeger...
   Enriched successfully! Telemetry source: jaeger
   Root span: security filterchain before (8ms)
   Span count: 6
5. Machine-readable proof recorded: reports/observability/live-proof.json

✅ Real End-to-End Observability & Jaeger Round-Trip VERIFIED!
```

The machine-readable result is recorded in `reports/observability/live-proof.json` with actual trace ID, span details, and timestamp.

---

## Illustrative Example: Async Failure Triage Flow

> [!NOTE]
> The following scenario is an **illustrative walkthrough** showing how async failure evidence bundles interact with the enricher and triage engine when an SLA breach occurs.

### Input Bundle (`sample-failure.json`)
```json
{
  "schemaVersion": "1.0",
  "testId": "API-PAY-003",
  "testName": "asyncPayrollProcessing",
  "layer": "api",
  "component": "payroll",
  "errorMessage": "Payroll processing SLA breached: run remained in PROCESSING state beyond deadline",
  "correlationId": "demo-trace-illustrative-001",
  "httpStatus": 202
}
```

### Enriching Telemetry
```bash
npm run quality:enrich-evidence -- reports/failures/sample-failure.json --output reports/failures/enriched-failure.json
```

*(Illustrative Output)*:
```text
Enriching evidence for test: API-PAY-003 (correlationId: demo-trace-illustrative-001)
✅ Retrieved trace from Jaeger (4 spans)
   Root span: POST /api/payroll-runs/{id}/process (duration: 3820ms)
🔒 Redacted 0 sensitive token/credential match(es).
Enriched evidence saved to: reports/failures/enriched-failure.json
```

### Running Triage
```bash
npm run quality:triage -- reports/failures/enriched-failure.json
```

The triage assistant outputs a schema-validated classification:
- Classification: `PRODUCT_DEFECT` or `ENVIRONMENT`
- Confidence: `0.91`
- Evidence: Includes Jaeger trace ID, failing span name, span duration, and HTTP status code.
- Recommended Owner: `backend`
- Recommended Next Action: "Inspect correlated backend logs and trace IDs around timestamp; patch domain service logic."

---

## Security Boundary: Credential Redaction & Log Bounds
The evidence enricher guarantees:
1. **Zero Token Leaks**: All `Bearer [JWT]` strings are replaced with `[REDACTED_JWT]`.
2. **Password Sanitization**: `password=...` and `"password": "..."` values are sanitized to `[REDACTED]`.
3. **Payload Truncation**: No unbounded stack traces or application logs are forwarded to external LLMs. Max string length is bounded at 4KB.
4. **Prompt Injection Guard**: Logs containing prompt injection attacks (e.g. `Ignore system prompt...`) are treated as untrusted data strings.
