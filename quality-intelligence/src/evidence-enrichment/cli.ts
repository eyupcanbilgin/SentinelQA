import { readFileSync, writeFileSync } from 'node:fs';
import { enrichFailureEvidence } from './enricher.js';
import { FailureEvidenceSchema } from '../failure-triage/evidence.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: quality:enrich-evidence <path-to-evidence.json> [--output <path>] [--jaeger <url>]');
    process.exit(1);
  }

  const inputFile = args[0];
  let outputFile: string | undefined;
  let jaegerUrl = process.env.JAEGER_URL || 'http://localhost:16686';

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[++i];
    } else if (args[i] === '--jaeger' && args[i + 1]) {
      jaegerUrl = args[++i];
    }
  }

  const rawJson = JSON.parse(readFileSync(inputFile, 'utf8'));
  const evidence = FailureEvidenceSchema.parse(rawJson);

  console.log(`Enriching evidence for test: ${evidence.testId} (correlationId: ${evidence.correlationId ?? 'none'})`);
  const enriched = await enrichFailureEvidence(evidence, { jaegerUrl });

  if (enriched.telemetrySource === 'jaeger') {
    console.log(`✅ Retrieved trace ${enriched.traceSummary?.traceId} from Jaeger (${enriched.traceSummary?.spans.length} spans)`);
    if (enriched.traceSummary?.failingSpan) {
      console.log(`   Failing span: ${enriched.traceSummary.failingSpan}`);
    }
  } else {
    console.log(`ℹ️ No live Jaeger trace found for correlationId (telemetrySource: ${enriched.telemetrySource})`);
  }

  if ((enriched.redactedFieldsCount ?? 0) > 0) {
    console.log(`🔒 Redacted ${enriched.redactedFieldsCount} sensitive token/credential match(es) from evidence.`);
  }

  const outputContent = JSON.stringify(enriched, null, 2) + '\n';
  if (outputFile) {
    writeFileSync(outputFile, outputContent);
    console.log(`Enriched evidence saved to: ${outputFile}`);
  } else {
    console.log('\n--- Enriched Evidence Bundle ---');
    console.log(outputContent);
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
