import { test, expect } from '../fixtures/workforce.js';

function cents(value: string): bigint {
  expect(typeof value, 'Money must use decimal strings').toBe('string');
  expect(value).toMatch(/^\d+\.\d{2}$/);
  return BigInt(value.replace('.', ''));
}

test('E2E-PAY-001 admin processes payroll, reviews exact amounts, and finalizes immutable items', async ({ page, loginAs, journey }) => {
  test.info().annotations.push({ type: 'requirement', description: 'PAYROLL-001, PAYROLL-002, PAYROLL-003' });
  journey.expectedState = 'Only the administrator sees payroll; a new period creates one run.';
  await loginAs('employee1');
  await expect(page.getByRole('button', { name: 'Payroll', exact: true })).toHaveCount(0);
  const token = await loginAs('admin');
  await page.getByRole('button', { name: 'Payroll', exact: true }).click();
  const randomYear = 2030 + Math.floor(Math.random() * 60);
  const randomMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const period = process.env.E2E_PAYROLL_PERIOD ?? `${randomYear}-${randomMonth}`;
  await page.getByLabel('Payroll period', { exact: true }).fill(period);
  await page.getByRole('button', { name: 'Create payroll run', exact: true }).click();
  const row = page.getByRole('table', { name: 'Payroll runs', exact: true }).getByRole('row').filter({ hasText: period });
  await expect(row).toContainText('Created');

  journey.expectedState = 'Asynchronous payroll completes and renders linked employee items and nonzero total.';
  const queued = page.waitForResponse(response => /\/api\/payroll-runs\/[^/]+\/process$/.test(response.url()) && response.request().method() === 'POST');
  await row.getByRole('button', { name: 'Process payroll', exact: true }).click();
  const processResponse = await queued;
  expect(processResponse.status()).toBe(202);
  const runId = (await processResponse.json() as { id: string }).id;
  await expect(row).toContainText('Completed', { timeout: 30_000 });
  await row.getByRole('button', { name: 'View details', exact: true }).click();
  const details = page.getByRole('region', { name: 'Payroll details', exact: true });
  const items = details.getByRole('table', { name: 'Payroll items', exact: true });
  await expect(items.locator('tbody tr').first()).toBeVisible();
  const completedResponse = await page.request.get(`/api/payroll-runs/${runId}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(completedResponse.status()).toBe(200);
  const completed = await completedResponse.json() as {
    status: string; totalNet: string; items: { id: string; employeeId: string; baseSalary: string; tax: string; deductions: string; netPay: string }[];
  };
  expect(completed.status).toBe('COMPLETED');
  expect(completed.items.length).toBeGreaterThan(0);
  let total = 0n;
  for (const item of completed.items) {
    expect(item.employeeId).toMatch(/^[0-9a-f-]{36}$/);
    expect(cents(item.netPay)).toBe(cents(item.baseSalary) - cents(item.tax) - cents(item.deductions));
    total += cents(item.netPay);
  }
  expect(cents(completed.totalNet)).toBe(total);
  expect(total).toBeGreaterThan(0n);
  await expect(items.locator('tbody tr')).toHaveCount(completed.items.length);

  journey.expectedState = 'Finalized payroll retains the same item IDs and amounts; processing/finalization controls disappear.';
  await row.getByRole('button', { name: 'Finalize payroll', exact: true }).click();
  await expect(row).toContainText('Finalized');
  await expect(row.getByRole('button', { name: 'Process payroll', exact: true })).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Finalize payroll', exact: true })).toHaveCount(0);
  await expect(details).toContainText('Finalized payroll is locked');
  const finalResponse = await page.request.get(`/api/payroll-runs/${runId}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(finalResponse.status()).toBe(200);
  const finalized = await finalResponse.json();
  expect(finalized.status).toBe('FINALIZED');
  expect(finalized.totalNet).toBe(completed.totalNet);
  expect(finalized.items).toEqual(completed.items);
  journey.observations.push(`Run ${runId}; ${completed.items.length} payroll items preserved; total ${completed.totalNet}`);
});
