export const sources = ['unit', 'integration', 'security', 'e2e', 'performance', 'mutation', 'agentEvals'] as const;
export type Source = typeof sources[number];
export type Profile = 'pr' | 'nightly' | 'release';
export type Decision = 'PASS' | 'WARN' | 'BLOCK' | 'INSUFFICIENT_EVIDENCE';
export type TestOutcome = 'PASS' | 'FAIL' | 'SKIPPED';
export interface TestRecord { id: string; name: string; outcome: TestOutcome }
export interface Normalized {
  status: 'PASS' | 'FAIL' | 'NOT_RUN';
  metrics: Record<string, number | string>;
  reasons: string[];
  tests?: TestRecord[];
}
export interface Provenance {
  path: string;
  sha256: string;
  bytes: number;
  modifiedAt: string;
  reportedAt?: string;
  ageHours: number;
}
export interface Evidence extends Normalized {
  source: Source;
  required: boolean;
  availability: 'VALID' | 'MISSING' | 'INVALID' | 'STALE';
  artifacts: Provenance[];
}
export interface GateConfig {
  schemaVersion: '1.0';
  maxAgeHours: number;
  profiles: Record<Profile, { required: Source[] }>;
  criticalSecurityIds: string[];
  criticalE2eIds: string[];
  performance: { maxErrorRate: number; maxP95Ms: number };
  mutation: { minimumScore: number };
  ai: { minimumAccuracy: number; maxUnsafeRecommendationRate: number };
}
export interface RunManifest { schemaVersion: '1.0'; runId: string; commit: string | null; startedAt: string }
export interface GateReport {
  schemaVersion: '1.0';
  generatedAt: string;
  profile: Profile;
  decision: Decision;
  exitCode: 0 | 1;
  recommendation: string;
  run: RunManifest | null;
  provenanceWarning: string | null;
  evidence: Evidence[];
  reasons: string[];
}
