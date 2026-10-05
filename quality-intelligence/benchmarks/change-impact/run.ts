import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { selectTests } from '../../src/test-selector/selection.js';

interface TestCase {
  id: string;
  name: string;
  changedFiles: string[];
  expectedComponents: string[];
  expectedRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  mandatoryTests: string[];
  broadenExpected: boolean;
}

async function runBenchmark() {
  console.log('=== SentinelQE Test Selection & Change-Impact Benchmark ===');

  const catalog = parse(readFileSync('quality/test-catalog.yml', 'utf8'));
  const componentMap = parse(readFileSync('quality/component-map.yml', 'utf8'));
  const cases: TestCase[] = JSON.parse(
    readFileSync('quality-intelligence/benchmarks/change-impact/cases.json', 'utf8')
  );

  const totalCatalogTests = catalog.tests.length;
  let totalMandatoryExpected = 0;
  let totalMandatoryRecalled = 0;
  let criticalFalseNegatives = 0;
  let totalSelectedAcrossTargetedCases = 0;
  let totalPossibleAcrossTargetedCases = 0;
  let broadenCount = 0;

  const caseResults = [];

  for (const c of cases) {
    const result = selectTests(c.changedFiles, catalog, componentMap);
    const selectedIds = new Set(result.selectedTests.map(t => t.id));

    // Check mandatory tests recall
    const missingMandatory = c.mandatoryTests.filter(id => !selectedIds.has(id));
    const recalledMandatory = c.mandatoryTests.length - missingMandatory.length;

    totalMandatoryExpected += c.mandatoryTests.length;
    totalMandatoryRecalled += recalledMandatory;

    if (missingMandatory.length > 0) {
      criticalFalseNegatives += missingMandatory.length;
    }

    if (result.runBroaderSuite) {
      broadenCount++;
    } else {
      totalSelectedAcrossTargetedCases += result.selectedTests.length;
      totalPossibleAcrossTargetedCases += totalCatalogTests;
    }

    // Check component recall
    const missingComponents = c.expectedComponents.filter(comp => !result.affectedComponents.includes(comp));

    caseResults.push({
      id: c.id,
      name: c.name,
      changedFiles: c.changedFiles,
      expectedRisk: c.expectedRisk,
      actualRisk: result.riskLevel,
      riskMatched: c.expectedRisk === result.riskLevel,
      broadenExpected: c.broadenExpected,
      broadenActual: result.runBroaderSuite,
      selectedCount: result.selectedTests.length,
      reductionPercent: Number(((1 - result.selectedTests.length / totalCatalogTests) * 100).toFixed(1)),
      missingMandatory,
      missingComponents,
      status: missingMandatory.length === 0 ? 'PASS' : 'FAIL',
    });
  }

  const criticalRecallRate = totalMandatoryExpected > 0 ? totalMandatoryRecalled / totalMandatoryExpected : 1.0;
  const targetedReductionRate =
    totalPossibleAcrossTargetedCases > 0
      ? 1 - totalSelectedAcrossTargetedCases / totalPossibleAcrossTargetedCases
      : 0;
  const broadeningRate = broadenCount / cases.length;

  const summary = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    criticalFalseNegatives,
    criticalRecallRate: Number((criticalRecallRate * 100).toFixed(2)),
    targetedSuiteReductionPercent: Number((targetedReductionRate * 100).toFixed(1)),
    broadeningRate: Number((broadeningRate * 100).toFixed(1)),
    broadenCount,
    totalCatalogTests,
    caseResults,
  };

  mkdirSync('reports/change-impact', { recursive: true });
  writeFileSync('reports/change-impact/benchmark.json', JSON.stringify(summary, null, 2) + '\n');

  // Generate Markdown summary
  let md = `# Test Selection & Change-Impact Benchmark\n\n`;
  md += `**Generated**: ${summary.generatedAt}\n\n`;
  md += `| Metric | Result | Target / Safety Policy |\n`;
  md += `| :--- | :---: | :---: |\n`;
  md += `| **Critical False Negatives** | **${summary.criticalFalseNegatives}** | **0 (Hard Invariant)** |\n`;
  md += `| **Critical Test Recall Rate** | **${summary.criticalRecallRate}%** | 100.0% |\n`;
  md += `| **Targeted Suite Reduction** | **${summary.targetedSuiteReductionPercent}%** | Reference measure |\n`;
  md += `| **Safety Broadening Rate** | **${summary.broadeningRate}%** (${broadenCount}/${cases.length} cases) | Safety fallback on shared/unmapped |\n\n`;

  md += `## Evaluated Pull Request Scenarios\n\n`;
  md += `| PR ID | Scenario | Risk | Broaden? | Selected | Reduction | Critical Recall | Status |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const r of caseResults) {
    md += `| \`${r.id}\` | ${r.name} | ${r.actualRisk} | ${r.broadenActual ? 'YES' : 'no'} | ${r.selectedCount}/${totalCatalogTests} | ${r.reductionPercent}% | ${r.missingMandatory.length === 0 ? '100%' : 'MISSED: ' + r.missingMandatory.join(',')} | **${r.status}** |\n`;
  }

  writeFileSync('reports/change-impact/benchmark.md', md);

  console.log(`\nResults:`);
  console.log(`  Critical False Negatives: ${criticalFalseNegatives} (target: 0)`);
  console.log(`  Critical Recall Rate:     ${summary.criticalRecallRate}%`);
  console.log(`  Targeted Reduction Rate:  ${summary.targetedSuiteReductionPercent}%`);
  console.log(`  Safety Broadening Rate:   ${summary.broadeningRate}%`);
  console.log(`Reports saved to reports/change-impact/benchmark.json & benchmark.md\n`);

  if (criticalFalseNegatives > 0) {
    console.error('FAILED: Critical false negatives detected in test selection benchmark!');
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
