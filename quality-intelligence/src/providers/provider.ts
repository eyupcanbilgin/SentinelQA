export interface StructuredAiRequest<T> {
  prompt: string;
  systemPrompt?: string;
  schemaDescription?: string;
  evidence: unknown;
}

export interface AiProvider {
  readonly name: string;
  generateStructured<T>(request: StructuredAiRequest<T>): Promise<T>;
}
