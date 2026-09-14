import { z } from 'zod';

export const catalogSchema = z.object({ version: z.literal(1), tests: z.array(z.object({
  id: z.string().regex(/^[A-Z0-9]+-[A-Z]+-\d{3}$/), name: z.string().min(1),
  layer: z.enum(['unit', 'integration', 'api', 'e2e', 'performance', 'security', 'quality']),
  components: z.array(z.string()).min(1), tags: z.array(z.string()),
  requirements: z.array(z.string()).min(1), source: z.string().min(1),
})).min(1) });
export const componentMapSchema = z.object({ version: z.literal(1), sharedPaths: z.array(z.string()),
  components: z.record(z.string(), z.object({ paths: z.array(z.string()).min(1), impact: z.number().int().min(1).max(5),
    likelihood: z.number().int().min(1).max(5), rationale: z.string() })) });
export type Catalog = z.infer<typeof catalogSchema>;
export type ComponentMap = z.infer<typeof componentMapSchema>;

export function pathMatches(path: string, pattern: string): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  let expression = '';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern.slice(i, i + 3) === '**/') { expression += '(?:.*/)?'; i += 2; }
    else if (pattern.slice(i, i + 2) === '**') { expression += '.*'; i++; }
    else if (pattern[i] === '*') expression += '[^/]*';
    else expression += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${expression}$`).test(normalized);
}

export function selectTests(changedFiles: string[], rawCatalog: unknown, rawMap: unknown) {
  const catalog = catalogSchema.parse(rawCatalog), mapping = componentMapSchema.parse(rawMap);
  if (new Set(catalog.tests.map(t => t.id)).size !== catalog.tests.length) throw new Error('Duplicate test IDs');
  const files = [...new Set(changedFiles)].sort();
  const affected = new Set<string>(), unknown: string[] = [], shared: string[] = [];
  for (const file of files) {
    const matches = Object.entries(mapping.components).filter(([, c]) => c.paths.some(p => pathMatches(file, p)));
    matches.forEach(([name]) => affected.add(name));
    if (mapping.sharedPaths.some(p => pathMatches(file, p))) shared.push(file);
    else if (!matches.length) unknown.push(file);
  }
  const incompleteCatalog = [...affected].filter(c => c !== 'documentation' && !catalog.tests.some(t => t.components.includes(c)));
  const broaden = unknown.length > 0 || shared.length > 0 || incompleteCatalog.length > 0 || affected.has('quality');
  const score = broaden ? 25 : Math.max(1, ...[...affected].map(c => mapping.components[c].impact * mapping.components[c].likelihood));
  const selectedTests = catalog.tests.flatMap(test => {
    const components = test.components.filter(c => affected.has(c));
    const reasons = broaden ? ['Safety fallback: shared, unmapped or quality-system change requires full catalog coverage.'] :
      components.length ? components.map(c => `${c}: ${mapping.components[c].rationale}`) :
        test.tags.includes('always') ? ['Mandatory baseline checks remain selected.'] : [];
    return reasons.length ? [{ id: test.id, layer: test.layer, source: test.source, reasons }] : [];
  });
  return { schemaVersion: '1.0', generatedAt: new Date().toISOString(), changedFiles: files,
    affectedComponents: [...affected].sort(), unmappedFiles: unknown, sharedFiles: shared,
    incompleteCatalog, riskLevel: score >= 15 ? 'HIGH' : score >= 6 ? 'MEDIUM' : 'LOW', score,
    confidence: broaden ? 0 : 1, runBroaderSuite: broaden, selectedTests,
    requiredSuites: [...new Set(selectedTests.map(t => t.layer))].sort(),
    reasoningSummary: broaden ? ['Selection uncertainty expands coverage; AI cannot remove tests.'] :
      [...affected].map(c => mapping.components[c].rationale),
  };
}

export interface TestPlan {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  runBroaderSuite: boolean;
  selectedTestIds: string[];
  requiredLayers: string[];
  reasons: Record<string, string[]>;
}

export function generateTestPlan(selectionResult: ReturnType<typeof selectTests>): TestPlan {
  const reasons: Record<string, string[]> = {};
  for (const test of selectionResult.selectedTests) {
    reasons[test.id] = test.reasons;
  }
  return {
    riskLevel: selectionResult.riskLevel,
    runBroaderSuite: selectionResult.runBroaderSuite,
    selectedTestIds: selectionResult.selectedTests.map(t => t.id),
    requiredLayers: selectionResult.requiredSuites,
    reasons,
  };
}

export interface AiRiskEnrichment {
  additionalComponents?: string[];
  additionalTestIds?: string[];
  recommendedRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  rationale?: string;
  suggestedRemovals?: string[];
}

export function enrichPlanWithAi(
  deterministicPlan: TestPlan,
  aiProposal: AiRiskEnrichment
): {
  plan: TestPlan;
  safetyViolations: string[];
} {
  const safetyViolations: string[] = [];
  const deterministicSet = new Set(deterministicPlan.selectedTestIds);

  if (aiProposal.suggestedRemovals && aiProposal.suggestedRemovals.length > 0) {
    const attemptedRemovals = aiProposal.suggestedRemovals.filter(id => deterministicSet.has(id));
    if (attemptedRemovals.length > 0) {
      safetyViolations.push(
        `Safety Violation: AI attempted to remove ${attemptedRemovals.length} deterministic required test(s): ${attemptedRemovals.join(', ')}. Blocked by safety invariant.`
      );
    }
  }

  const combinedTestIds = new Set(deterministicPlan.selectedTestIds);
  if (aiProposal.additionalTestIds) {
    for (const id of aiProposal.additionalTestIds) {
      combinedTestIds.add(id);
    }
  }

  const riskRanks: Record<'LOW' | 'MEDIUM' | 'HIGH', number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  let effectiveRisk = deterministicPlan.riskLevel;
  if (aiProposal.recommendedRiskLevel) {
    const aiRank = riskRanks[aiProposal.recommendedRiskLevel];
    const detRank = riskRanks[deterministicPlan.riskLevel];
    if (aiRank < detRank) {
      safetyViolations.push(
        `Safety Violation: AI attempted to downgrade deterministic risk from ${deterministicPlan.riskLevel} to ${aiProposal.recommendedRiskLevel}. Preserving deterministic risk.`
      );
    } else if (aiRank > detRank) {
      effectiveRisk = aiProposal.recommendedRiskLevel;
    }
  }

  const enrichedReasons = { ...deterministicPlan.reasons };
  if (aiProposal.additionalTestIds && aiProposal.rationale) {
    for (const id of aiProposal.additionalTestIds) {
      if (!enrichedReasons[id]) {
        enrichedReasons[id] = [`AI recommendation: ${aiProposal.rationale}`];
      } else {
        enrichedReasons[id] = [...enrichedReasons[id], `AI recommendation: ${aiProposal.rationale}`];
      }
    }
  }

  return {
    plan: {
      riskLevel: effectiveRisk,
      runBroaderSuite: deterministicPlan.runBroaderSuite,
      selectedTestIds: [...combinedTestIds].sort(),
      requiredLayers: deterministicPlan.requiredLayers,
      reasons: enrichedReasons,
    },
    safetyViolations,
  };
}

