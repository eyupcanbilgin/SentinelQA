import { readFile } from 'node:fs/promises';
import { triageFailure } from './triage.js';
import { FailureEvidenceSchema } from './evidence.js';

async function main() {
  const args = process.argv.slice(2);
  let filePath = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--evidence' || args[i] === '-e') {
      filePath = args[++i];
    } else if (!filePath && !args[i].startsWith('-')) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error('Usage: npm run quality:triage -- <evidence-bundle.json>');
    process.exit(1);
  }

  try {
    const raw = JSON.parse(await readFile(filePath, 'utf8'));
    const evidencePayload = raw.evidence ?? raw;
    const evidence = FailureEvidenceSchema.parse(evidencePayload);
    const result = await triageFailure(evidence);

    console.log('\n=== SentinelQE Failure Triage Assistant ===');
    console.log(`Classification:       ${result.classification} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    console.log(`Suspected Component:  ${result.suspectedComponent}`);
    console.log(`Recommended Owner:    ${result.recommendedOwner}`);
    console.log(`Next Action:          ${result.recommendedNextAction}`);
    console.log('\nEvidence:');
    result.evidence.forEach(e => console.log(`  - ${e}`));
    console.log(`\nNote: ${result.disclaimer}\n`);

    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error(`Triage error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
