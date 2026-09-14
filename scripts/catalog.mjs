import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function files(dir) {
  try { return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name).replaceAll('\\','/')]); }
  catch { return []; }
}
const requirementDetails = {
  'AUTH-001': 'JWT authentication fails closed and does not disclose credentials.',
  'AUTHZ-001': 'Salary, leave objects and payroll actions enforce role and ownership boundaries.',
  'LEAVE-001': 'Reserve sufficient inclusive calendar-day leave; authorized final decisions consume balance exactly once.',
  'PAYROLL-001': 'Decimal salary outputs and asynchronous run processing remain unique and immutable after finalization.',
  'DATA-001': 'Flyway-managed PostgreSQL constraints and transactions preserve domain relationships.',
  'QUALITY-001': 'Selection, triage and release recommendations validate evidence and broaden or abstain when uncertain.',
  'PERF-001': 'Reference workloads enforce response, completion and error-rate budgets.'
};
const tests = new Map();
for (const file of [...files('backend/src/test/java'),...files('tests/e2e'),...files('quality-intelligence/test'),...files('performance')]) {
  if(!/\.(java|ts|js)$/.test(file) || file.includes('node_modules')) continue;
  const source=readFileSync(file,'utf8');
  const pattern=/(?:@DisplayName\("|test\(['"`]|test\.\w+\(['"`]|testId:\s*['"])([A-Z]+-[A-Z]+-\d{3})[:\s]*([^\n"'`]*)/g;
  for(const match of source.matchAll(pattern)) {
    const [prefix,area] = match[1].split('-');
    const component = area === 'AUTH' || area==='AUTHZ' ? 'authorization' : area==='LEAVE' ? 'leave' : area==='PAY' ? 'payroll' : area==='DATA' ? 'employees' : 'quality';
    const layer={UNIT:'unit',API:'api',SEC:'security',INT:'integration',E2E:'e2e',PERF:'performance',QI:'quality'}[prefix];
    if(!layer) continue;
    const requirement=prefix==='PERF'?'PERF-001':area==='AUTH'?'AUTH-001':area==='AUTHZ'?'AUTHZ-001':area==='LEAVE'?'LEAVE-001':area==='PAY'?'PAYROLL-001':area==='DATA'?'DATA-001':'QUALITY-001';
    if(tests.has(match[1])) throw new Error(`Duplicate catalog ID ${match[1]}`);
    tests.set(match[1],{id:match[1],name:match[2].trim()||match[1],layer,components:prefix==='E2E'?[component,'frontend']:[component],
      tags:match[1]==='API-AUTH-001'||match[1]==='QI-SELECT-001'?['critical','always']:['critical'],
      requirements:[requirement],source:file});
  }
}
if(!tests.size) throw new Error('No stable test IDs found');
const sorted=[...tests.values()].sort((a,b)=>a.id.localeCompare(b.id));
writeFileSync('quality/test-catalog.yml',JSON.stringify({version:1,tests:sorted},null,2)+'\n');
const requirements=Object.fromEntries(Object.entries(requirementDetails).map(([id,description])=>[id,{description,risk:'high',tests:sorted.filter(t=>t.requirements.includes(id)).map(t=>t.id)}]).filter(([,r])=>r.tests.length));
writeFileSync('quality/requirements.yml',JSON.stringify({version:1,requirements},null,2)+'\n');
console.log(`Catalog refreshed: ${sorted.length} source-backed stable test IDs.`);
