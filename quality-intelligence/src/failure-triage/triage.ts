import { type FailureEvidence } from './evidence.js';
import { type TriageResult, TriageResultSchema } from './schema.js';
import { type AiProvider } from '../providers/provider.js';
import { MockAiProvider } from '../providers/mock-provider.js';
import { RealAiProvider } from '../providers/real-provider.js';

export function getAiProvider(): AiProvider {
  if (process.env.AI_PROVIDER && process.env.AI_API_KEY) {
    try {
      return new RealAiProvider();
    } catch {
      return new MockAiProvider();
    }
  }
  return new MockAiProvider();
}

export async function triageFailure(
  evidence: FailureEvidence,
  provider: AiProvider = getAiProvider()
): Promise<TriageResult> {
  const prompt = `Analyze the following test failure evidence bundle and classify it into one of: PRODUCT_DEFECT, TEST_DEFECT, ENVIRONMENT, TEST_DATA, FLAKY_TEST, UNKNOWN.
Provide confidence, suspected component, specific evidence points, recommended owner, and next action.`;

  const result = await provider.generateStructured<TriageResult>({
    prompt,
    systemPrompt: 'You are SentinelQE Failure Triage Assistant. Analyze failure evidence conservatively.',
    schemaDescription: 'TriageResultSchema version 1.0',
    evidence,
  });

  return TriageResultSchema.parse(result);
}
