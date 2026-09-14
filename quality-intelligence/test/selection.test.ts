import test from 'node:test';
import assert from 'node:assert/strict';
import { pathMatches, selectTests } from '../src/test-selector/selection.js';
const catalog = { version: 1, tests: [
  { id:'API-PAY-001', name:'Payroll',layer:'api',components:['payroll'],tags:[],requirements:['PAYROLL-001'],source:'payroll.test' },
  { id:'API-AUTH-001',name:'Login',layer:'security',components:['authorization'],tags:['always'],requirements:['AUTH-001'],source:'auth.test' }
] };
const mapping = { version:1,sharedPaths:['backend/pom.xml'],components:{
  payroll:{paths:['backend/**/payroll/**'],impact:5,likelihood:4,rationale:'Money changed'},
  authorization:{paths:['backend/**/auth/**'],impact:5,likelihood:4,rationale:'Access boundaries'}
} };
test('QI-SELECT-001 financial changes select business coverage and baseline',()=>{
  const result = selectTests(['backend/src/payroll/Calculate.java'],catalog,mapping);
  assert.equal(result.riskLevel,'HIGH'); assert.equal(result.score,20);
  assert.deepEqual(result.selectedTests.map(t=>t.id),['API-PAY-001','API-AUTH-001']);
  assert.equal(result.runBroaderSuite,false);
});
test('QI-SELECT-002 unknown and shared changes cannot narrow test coverage',()=>{
  for(const path of ['new-module/secret.ts','backend/pom.xml']) {
    const result = selectTests([path],catalog,mapping); assert.equal(result.runBroaderSuite,true);
    assert.equal(result.selectedTests.length,2); assert.equal(result.confidence,0);
  }
});
test('glob semantics include zero or multiple directories and Windows paths',()=>{
  assert.ok(pathMatches('backend/payroll/a.java','backend/**/payroll/**'));
  assert.ok(pathMatches('backend\\src\\payroll\\a.java','backend/**/payroll/**'));
  assert.ok(!pathMatches('frontend/payroll/a.java','backend/**/payroll/**'));
  assert.ok(!pathMatches('docs/a/b.md','docs/*.md'));
});
test('malformed or duplicate catalog cannot silently produce unsafe selection',()=>{
  assert.throws(()=>selectTests([],{},mapping));
  assert.throws(()=>selectTests([], {...catalog,tests:[catalog.tests[0],catalog.tests[0]]},mapping));
});
test('new mapped component without catalog coverage broadens',()=>{
  const m = {...mapping,components:{...mapping.components,new:{paths:['new/**'],impact:3,likelihood:3,rationale:'New module'}}};
  assert.equal(selectTests(['new/code.ts'],catalog,m).runBroaderSuite,true);
});

test('QI-SELECT-003 AI cannot remove deterministic tests or downgrade risk', async () => {
  const { generateTestPlan, enrichPlanWithAi } = await import('../src/test-selector/selection.js');
  const deterministicResult = selectTests(['backend/src/payroll/Calculate.java'], catalog, mapping);
  const plan = generateTestPlan(deterministicResult);

  assert.equal(plan.riskLevel, 'HIGH');
  assert.deepEqual(plan.selectedTestIds, ['API-PAY-001', 'API-AUTH-001']);

  // Malicious / hallucinated AI proposal: attempts to remove critical test and downgrade risk to LOW
  const adversarialProposal = {
    suggestedRemovals: ['API-AUTH-001'],
    recommendedRiskLevel: 'LOW' as const,
    additionalTestIds: ['PERF-PAY-001'],
    rationale: 'AI suggests running perf test but skipping auth to save time',
  };

  const { plan: enrichedPlan, safetyViolations } = enrichPlanWithAi(plan, adversarialProposal);

  // Assert: deterministic test was NOT removed
  assert.ok(enrichedPlan.selectedTestIds.includes('API-AUTH-001'));
  // Assert: additional test was safely added
  assert.ok(enrichedPlan.selectedTestIds.includes('PERF-PAY-001'));
  // Assert: risk was NOT downgraded
  assert.equal(enrichedPlan.riskLevel, 'HIGH');
  // Assert: safety violations were explicitly recorded
  assert.equal(safetyViolations.length, 2);
  assert.ok(safetyViolations[0].includes('AI attempted to remove 1 deterministic required test'));
  assert.ok(safetyViolations[1].includes('AI attempted to downgrade deterministic risk from HIGH to LOW'));
});

