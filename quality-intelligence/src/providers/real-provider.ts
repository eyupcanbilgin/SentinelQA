import type { AiProvider, StructuredAiRequest } from './provider.js';
import { TriageResultSchema } from '../failure-triage/schema.js';

export class RealAiProvider implements AiProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor() {
    this.name = process.env.AI_PROVIDER || 'custom-llm';
    this.apiKey = process.env.AI_API_KEY || '';
    this.endpoint = process.env.AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    if (!this.apiKey) {
      throw new Error('RealAiProvider requires AI_API_KEY to be configured in the environment.');
    }
  }

  async generateStructured<T>(request: StructuredAiRequest<T>): Promise<T> {
    const payload = {
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${request.systemPrompt ?? 'You are a Principal Quality Engineer triaging test failures.'} Return ONLY valid JSON adhering to the specified schema. Never claim AI determined root cause with absolute certainty; always frame as AI-assisted suggestion.`,
        },
        {
          role: 'user',
          content: `${request.prompt}\n\nEvidence:\n${JSON.stringify(request.evidence, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Real AI provider returned HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error('No content returned from real AI provider');

    const parsed = JSON.parse(content);
    return TriageResultSchema.parse(parsed) as unknown as T;
  }
}
