import { z } from 'zod';

export const FailureEvidenceSchema = z.object({
  runId: z.string().optional(),
  testId: z.string().min(1),
  testName: z.string().min(1),
  layer: z.enum(['unit', 'integration', 'api', 'e2e', 'performance', 'security', 'quality']),
  component: z.string().optional(),
  errorMessage: z.string().min(1),
  stackTrace: z.string().optional(),
  httpStatus: z.number().int().optional(),
  networkLogs: z.array(z.string()).optional(),
  backendLogs: z.array(z.string()).optional(),
  consoleLogs: z.array(z.string()).optional(),
  correlationId: z.string().optional(),
  traceId: z.string().optional(),
  screenshotPath: z.string().optional(),
  gitDiff: z.string().optional(),
  retryHistory: z.object({
    attemptCount: z.number().int().min(1),
    passedOnRetry: z.boolean(),
    intermittent: z.boolean(),
  }).optional(),
});

export type FailureEvidence = z.infer<typeof FailureEvidenceSchema>;
