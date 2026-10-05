import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const isVerify = process.argv.includes('--verify');

function files(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      if (e.name === 'node_modules') return [];
      return e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name).replaceAll('\\', '/')];
    });
  } catch {
    return [];
  }
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

const scannedTests = new Map();
const duplicates = [];

for (const file of [
  ...files('backend/src/test/java'),
  ...files('tests/e2e'),
  ...files('quality-intelligence/test'),
  ...files('performance')
]) {
  if (!/\.(java|ts|js)$/.test(file) || file.includes('node_modules')) continue;
  const source = readFileSync(file, 'utf8');
  const pattern = /(?:@DisplayName\("|test\(['"`]|test\.\w+\(['"`]|testId:\s*['"])([A-Z0-9]+-[A-Z]+-\d{3})[:\s]*([^\n"'`]*)/g;
  for (const match of source.matchAll(pattern)) {
    const id = match[1];
    const [prefix, area] = id.split('-');
    const component =
      area === 'AUTH' || area === 'AUTHZ'
        ? 'authorization'
        : area === 'LEAVE'
        ? 'leave'
        : area === 'PAY'
        ? 'payroll'
        : area === 'DATA'
        ? 'employees'
        : 'quality';
    const layer = {
      UNIT: 'unit',
      API: 'api',
      SEC: 'security',
      INT: 'integration',
      E2E: 'e2e',
      PERF: 'performance',
      QI: 'quality'
    }[prefix];
    if (!layer) continue;
    const requirement =
      prefix === 'PERF'
        ? 'PERF-001'
        : area === 'AUTH'
        ? 'AUTH-001'
        : area === 'AUTHZ'
        ? 'AUTHZ-001'
        : area === 'LEAVE'
        ? 'LEAVE-001'
        : area === 'PAY'
        ? 'PAYROLL-001'
        : area === 'DATA'
        ? 'DATA-001'
        : 'QUALITY-001';

    if (scannedTests.has(id)) {
      duplicates.push({ id, file, firstSeen: scannedTests.get(id).source });
    }
    scannedTests.set(id, {
      id,
      name: match[2].trim() || id,
      layer,
      components: prefix === 'E2E' ? [component, 'frontend'] : [component],
      tags: id === 'API-AUTH-001' || id === 'QI-SELECT-001' ? ['critical', 'always'] : ['critical'],
      requirements: [requirement],
      source: file
    });
  }
}

if (duplicates.length > 0) {
  console.error(`Error: Found ${duplicates.length} duplicate test ID(s):`);
  for (const d of duplicates) {
    console.error(`  - ${d.id} in ${d.file} (already defined in ${d.firstSeen})`);
  }
  process.exit(1);
}

if (!scannedTests.size) {
  console.error('Error: No stable test IDs found in test source files.');
  process.exit(1);
}

const sortedScanned = [...scannedTests.values()].sort((a, b) => a.id.localeCompare(b.id));
const generatedCatalog = { version: 1, tests: sortedScanned };
const generatedRequirements = {
  version: 1,
  requirements: Object.fromEntries(
    Object.entries(requirementDetails)
      .map(([id, description]) => [
        id,
        {
          description,
          risk: 'high',
          tests: sortedScanned.filter(t => t.requirements.includes(id)).map(t => t.id)
        }
      ])
      .filter(([, r]) => r.tests.length)
  )
};

if (isVerify) {
  console.log('=== Quality Catalog Verification ===');
  let hasErrors = false;

  let committedCatalog;
  let committedReqs;
  try {
    committedCatalog = JSON.parse(readFileSync('quality/test-catalog.yml', 'utf8'));
    committedReqs = JSON.parse(readFileSync('quality/requirements.yml', 'utf8'));
  } catch (err) {
    console.error(`Failed to read committed catalog files: ${err.message}`);
    process.exit(1);
  }

  const committedTestIds = new Set(committedCatalog.tests.map(t => t.id));
  const scannedTestIds = new Set(scannedTests.keys());

  // 1. Tests in code but missing from catalog
  const missingFromCatalog = [...scannedTestIds].filter(id => !committedTestIds.has(id));
  if (missingFromCatalog.length > 0) {
    console.error(`[DRIFT] ${missingFromCatalog.length} test(s) exist in code but are missing from test-catalog.yml:`);
    missingFromCatalog.forEach(id => console.error(`  + ${id} (${scannedTests.get(id).source})`));
    hasErrors = true;
  }

  // 2. Tests in catalog with no executable test in code
  const missingFromCode = [...committedTestIds].filter(id => !scannedTestIds.has(id));
  if (missingFromCode.length > 0) {
    console.error(`[ORPHAN] ${missingFromCode.length} catalog entry/entries have no executable test in code:`);
    missingFromCode.forEach(id => console.error(`  - ${id}`));
    hasErrors = true;
  }

  // 3. Requirements referencing nonexistent tests
  for (const [reqId, req] of Object.entries(committedReqs.requirements || {})) {
    for (const testId of req.tests || []) {
      if (!scannedTestIds.has(testId)) {
        console.error(`[BROKEN_REQ] Requirement ${reqId} references nonexistent test: ${testId}`);
        hasErrors = true;
      }
    }
  }

  // 4. Tests referencing nonexistent requirements
  for (const test of committedCatalog.tests) {
    for (const reqId of test.requirements || []) {
      if (!requirementDetails[reqId]) {
        console.error(`[UNKNOWN_REQ] Test ${test.id} references undefined requirement: ${reqId}`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error('\nCatalog verification FAILED. Run "npm run catalog:refresh" to sync catalog with executable tests.');
    process.exit(1);
  }

  console.log(`PASS: Catalog is consistent with executable tests (${scannedTestIds.size} stable IDs verified).`);
} else {
  writeFileSync('quality/test-catalog.yml', JSON.stringify(generatedCatalog, null, 2) + '\n');
  writeFileSync('quality/requirements.yml', JSON.stringify(generatedRequirements, null, 2) + '\n');
  console.log(`Catalog refreshed: ${sortedScanned.length} source-backed stable test IDs written.`);
}
