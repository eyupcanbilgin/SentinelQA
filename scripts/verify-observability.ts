import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrichFailureEvidence } from '../quality-intelligence/src/evidence-enrichment/enricher.js';
import { type FailureEvidence } from '../quality-intelligence/src/failure-triage/evidence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function checkService(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('=== SentinelQA Live Observability & Jaeger Round-Trip Verification ===');

  const backendUrl = process.env.APP_URL || 'http://localhost:8080';
  const jaegerUrl = process.env.JAEGER_URL || 'http://localhost:16686';

  console.log(`Backend URL: ${backendUrl}`);
  console.log(`Jaeger URL:  ${jaegerUrl}\n`);

  const backendOk = await checkService(`${backendUrl}/actuator/health`);
  if (!backendOk) {
    throw new Error(`Backend at ${backendUrl} is not healthy. Start stack with: docker compose --profile observability up -d --wait`);
  }
  const jaegerOk = await checkService(`${jaegerUrl}/api/services`);
  if (!jaegerOk) {
    throw new Error(`Jaeger at ${jaegerUrl} is not reachable. Start stack with: docker compose --profile observability up -d --wait`);
  }
  console.log('Services verified healthy.');

  // 1. Authenticate
  console.log('1. Authenticating as employee1@example.test...');
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'employee1@example.test', password: 'LocalDemo!2026' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
  const loginData = (await loginRes.json()) as { token: string };
  const token = loginData.token;

  // 2. Send request with unique correlation ID
  const correlationId = `corr-verify-${Date.now()}`;
  console.log(`2. Sending HTTP request with X-Correlation-ID: ${correlationId}...`);
  const reqRes = await fetch(`${backendUrl}/api/employees/00000000-0000-0000-0000-000000000001`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Correlation-ID': correlationId,
    },
  });
  if (!reqRes.ok) throw new Error(`Employee request failed with status ${reqRes.status}`);
  const returnedCorrHeader = reqRes.headers.get('X-Correlation-ID');
  if (returnedCorrHeader !== correlationId) {
    throw new Error(`Expected correlation header '${correlationId}', got '${returnedCorrHeader}'`);
  }
  console.log(`   Response 200 OK. Backend confirmed X-Correlation-ID: ${returnedCorrHeader}`);

  // 3. Poll Jaeger for the trace containing correlation.id
  console.log('3. Polling Jaeger for span with correlation.id...');
  let traceData: any = null;
  const maxAttempts = 15;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 1000));
    const tagQuery = encodeURIComponent(JSON.stringify({ 'correlation.id': correlationId }));
    const fallbackTagQuery = encodeURIComponent(JSON.stringify({ correlationId }));
    
    let res = await fetch(`${jaegerUrl}/api/traces?service=workforceops&tags=${tagQuery}`);
    let json = res.ok ? ((await res.json()) as any) : null;
    if (!json?.data?.length) {
      res = await fetch(`${jaegerUrl}/api/traces?service=workforceops&tags=${fallbackTagQuery}`);
      json = res.ok ? ((await res.json()) as any) : null;
    }

    if (json?.data?.length > 0) {
      traceData = json.data[0];
      console.log(`   Trace found on attempt ${attempt}! Trace ID: ${traceData.traceID}`);
      break;
    }
  }

  if (!traceData) {
    throw new Error(`Failed to locate trace in Jaeger for correlation ID ${correlationId} after ${maxAttempts} attempts`);
  }

  // 4. Run Evidence Enricher
  console.log('4. Executing Evidence Enricher against live Jaeger...');
  const failureBundle: FailureEvidence = {
    testId: 'LIVE-OBS-VERIFY',
    testName: 'Employee Endpoint Live Tracing Verification',
    layer: 'api',
    errorMessage: 'Verification probe for Jaeger correlation attribute binding',
    httpStatus: 200,
    correlationId,
  };

  const enriched = await enrichFailureEvidence(failureBundle, { jaegerUrl });
  if (enriched.telemetrySource !== 'jaeger') {
    throw new Error(`Enricher reported telemetrySource '${enriched.telemetrySource}', expected 'jaeger'`);
  }

  console.log(`   Enriched successfully! Telemetry source: ${enriched.telemetrySource}`);
  console.log(`   Root span: ${enriched.traceSummary?.rootSpan} (${enriched.traceSummary?.durationMs}ms)`);
  console.log(`   Span count: ${enriched.traceSummary?.spanCount}`);

  // 5. Generate live-proof.json
  const commit = (() => {
    try {
      return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return 'local';
    }
  })();

  const proof = {
    verified: true,
    correlationId,
    traceId: enriched.traceId,
    telemetrySource: 'jaeger',
    spanCount: enriched.traceSummary?.spanCount ?? 0,
    rootSpan: enriched.traceSummary?.rootSpan ?? '',
    durationMs: enriched.traceSummary?.durationMs ?? 0,
    queriedAt: new Date().toISOString(),
    gitCommit: commit,
    command: 'tsx scripts/verify-observability.ts',
    spans: enriched.traceSummary?.spans ?? [],
  };

  const reportDir = path.join(ROOT, 'reports/observability');
  await mkdir(reportDir, { recursive: true });
  const proofPath = path.join(reportDir, 'live-proof.json');
  await writeFile(proofPath, JSON.stringify(proof, null, 2) + '\n');
  console.log(`5. Machine-readable proof recorded: ${proofPath}`);
  console.log('\n✅ Real End-to-End Observability & Jaeger Round-Trip VERIFIED!\n');
}

main().catch(err => {
  console.error('❌ Observability verification failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
