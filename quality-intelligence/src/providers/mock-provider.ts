import { RuleBasedTriageBaseline } from './rule-baseline.js';

/**
 * Backward compatibility alias: MockAiProvider delegates to RuleBasedTriageBaseline.
 * In SentinelQA V2, deterministic rules are treated as a first-class engineering baseline,
 * not a mock.
 */
export const MockAiProvider = RuleBasedTriageBaseline;
export type MockAiProvider = RuleBasedTriageBaseline;
