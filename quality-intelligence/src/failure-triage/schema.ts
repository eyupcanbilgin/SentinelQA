import { z } from 'zod';

export const TriageClassificationSchema = z.enum([
  'PRODUCT_DEFECT',
  'TEST_DEFECT',
  'ENVIRONMENT',
  'TEST_DATA',
  'FLAKY_TEST',
  'UNKNOWN'
]);

export type TriageClassification = z.infer<typeof TriageClassificationSchema>;

export const TriageOwnerSchema = z.enum([
  'backend',
  'frontend',
  'devops',
  'qa',
  'triage-team'
]);

export type TriageOwner = z.infer<typeof TriageOwnerSchema>;

export const TriageResultSchema = z.object({
  schemaVersion: z.literal('1.0'),
  classification: TriageClassificationSchema,
  confidence: z.number().min(0).max(1),
  suspectedComponent: z.string().min(1),
  evidence: z.array(z.string()).min(1),
  recommendedOwner: TriageOwnerSchema,
  recommendedNextAction: z.string().min(1),
  disclaimer: z.string().default('AI-assisted triage suggests this classification based on available failure signals; human review is required before taking destructive or release-blocking action.'),
});

export type TriageResult = z.infer<typeof TriageResultSchema>;
