import { type FailureEvidence } from '../failure-triage/evidence.js';

export interface NormalizedSpan {
  spanId: string;
  name: string;
  durationMs: number;
  status: 'OK' | 'ERROR' | 'UNSET';
  errorDetails?: string;
  component?: string;
}

export interface TraceSummary {
  traceId: string;
  durationMs: number;
  rootSpan?: string;
  failingSpan?: string;
  spanCount: number;
  spans: NormalizedSpan[];
}

export interface EnrichedFailureEvidence extends FailureEvidence {
  traceSummary?: TraceSummary;
  telemetrySource?: 'jaeger' | 'synthetic' | 'none';
  redactedFieldsCount?: number;
}

const REDACTION_PATTERNS = [
  { pattern: /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, replacement: 'Bearer [REDACTED_JWT]' },
  { pattern: /"password"\s*:\s*"[^"]+"/gi, replacement: '"password": "[REDACTED]"' },
  { pattern: /password=[^\s&]+/gi, replacement: 'password=[REDACTED]' },
  { pattern: /"secret"\s*:\s*"[^"]+"/gi, replacement: '"secret": "[REDACTED]"' },
  { pattern: /"token"\s*:\s*"[^"]+"/gi, replacement: '"token": "[REDACTED]"' },
];

export function redactSensitiveData(text: string): { redacted: string; count: number } {
  let redacted = text;
  let count = 0;

  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches) {
      count += matches.length;
      redacted = redacted.replace(pattern, replacement);
    }
  }

  // Bound maximum line length / total length for LLM safety
  if (redacted.length > 4096) {
    redacted = redacted.slice(0, 4096) + '... [TRUNCATED_AT_4KB]';
  }

  return { redacted, count };
}

export async function fetchJaegerTrace(
  correlationId: string,
  jaegerBaseUrl: string = process.env.JAEGER_URL || 'http://localhost:16686'
): Promise<TraceSummary | null> {
  try {
    // Search traces with canonical correlation.id tag, falling back to correlationId
    const searchJaeger = async (tagKey: string) => {
      const queryUrl = `${jaegerBaseUrl}/api/traces?service=workforceops&tags=${encodeURIComponent(
        JSON.stringify({ [tagKey]: correlationId })
      )}&limit=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(queryUrl, { signal: controller.signal });
        if (!res.ok) return null;
        return (await res.json()) as {
          data?: Array<{
            traceID: string;
            spans: Array<{
              spanID: string;
              operationName: string;
              duration: number;
              tags: Array<{ key: string; value: unknown }>;
            }>;
          }>;
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };

    let data = await searchJaeger('correlation.id');
    if (!data?.data || data.data.length === 0) {
      data = await searchJaeger('correlationId');
    }

    if (!data || !data.data || data.data.length === 0) {
      return null;
    }

    const rawTrace = data.data[0];
    const normalizedSpans: NormalizedSpan[] = [];
    let failingSpan: string | undefined;

    for (const span of rawTrace.spans) {
      const isError = span.tags.some(t => (t.key === 'error' && t.value === true) || (t.key === 'http.status_code' && Number(t.value) >= 500));
      const errorTag = span.tags.find(t => t.key === 'error.message' || t.key === 'exception.message');

      const norm: NormalizedSpan = {
        spanId: span.spanID,
        name: span.operationName,
        durationMs: Math.round(span.duration / 1000),
        status: isError ? 'ERROR' : 'OK',
        errorDetails: errorTag ? String(errorTag.value) : undefined,
      };

      if (isError && !failingSpan) {
        failingSpan = span.operationName;
      }

      normalizedSpans.push(norm);
    }

    // Sort by duration descending or execution sequence
    const totalDurationMs = Math.round(
      Math.max(...rawTrace.spans.map(s => s.duration)) / 1000
    );

    return {
      traceId: rawTrace.traceID,
      durationMs: totalDurationMs,
      rootSpan: rawTrace.spans[0]?.operationName,
      failingSpan,
      spanCount: rawTrace.spans.length,
      spans: normalizedSpans.slice(0, 10), // Bounded to 10 most relevant spans
    };
  } catch {
    return null;
  }
}

export async function enrichFailureEvidence(
  rawEvidence: FailureEvidence,
  options?: { jaegerUrl?: string; simulatedTrace?: TraceSummary }
): Promise<EnrichedFailureEvidence> {
  let totalRedacted = 0;

  // 1. Redact sensitive content in error message and logs
  const errorRedaction = redactSensitiveData(rawEvidence.errorMessage);
  totalRedacted += errorRedaction.count;

  const sanitizedBackendLogs = (rawEvidence.backendLogs ?? []).map(log => {
    const r = redactSensitiveData(log);
    totalRedacted += r.count;
    return r.redacted;
  });

  const sanitizedNetworkLogs = (rawEvidence.networkLogs ?? []).map(log => {
    const r = redactSensitiveData(log);
    totalRedacted += r.count;
    return r.redacted;
  });

  // 2. Telemetry lookup
  let traceSummary: TraceSummary | null = null;
  let telemetrySource: 'jaeger' | 'synthetic' | 'none' = 'none';

  if (options?.simulatedTrace) {
    traceSummary = options.simulatedTrace;
    telemetrySource = 'synthetic';
  } else if (rawEvidence.correlationId) {
    traceSummary = await fetchJaegerTrace(rawEvidence.correlationId, options?.jaegerUrl);
    if (traceSummary) {
      telemetrySource = 'jaeger';
    }
  }

  return {
    ...rawEvidence,
    errorMessage: errorRedaction.redacted,
    backendLogs: sanitizedBackendLogs,
    networkLogs: sanitizedNetworkLogs,
    traceId: traceSummary?.traceId ?? rawEvidence.traceId,
    traceSummary: traceSummary ?? undefined,
    telemetrySource,
    redactedFieldsCount: totalRedacted,
  };
}
