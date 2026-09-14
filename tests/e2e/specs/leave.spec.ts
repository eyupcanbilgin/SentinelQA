import { test, expect } from '../fixtures/workforce.js';

test('E2E-LEAVE-001 employee → manager → HR approval debits balance exactly once', async ({ page, loginAs, journey }) => {
  test.info().annotations.push({ type: 'requirement', description: 'LEAVE-001, LEAVE-002, LEAVE-003' });
  journey.expectedState = 'Employee can request two days while balance remains unchanged pending approval.';
  await loginAs('employee1');
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  const balance = page.getByLabel('Available leave balance');
  await expect(balance).toHaveText(/^\d+$/);
  const before = Number(await balance.textContent());
  expect(before).toBeGreaterThanOrEqual(2);
  const reason = `E2E-LEAVE-001-${crypto.randomUUID()}`;
  const start = process.env.E2E_LEAVE_START ?? '2035-04-12';
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  await page.getByLabel('Start date', { exact: true }).fill(start);
  await page.getByLabel('End date', { exact: true }).fill(end.toISOString().slice(0, 10));
  await page.getByLabel('Reason', { exact: true }).fill(reason);
  await page.getByRole('button', { name: 'Request leave', exact: true }).click();
  let row = page.getByRole('row').filter({ hasText: reason });
  await expect(row).toContainText('Pending manager');
  await expect(row.getByRole('cell', { name: '2', exact: true })).toBeVisible();
  await expect(balance).toHaveText(String(before));
  await expect(row.getByRole('button', { name: /Approve/ })).toHaveCount(0);

  journey.expectedState = 'The assigned manager advances the request to HR, without finalizing it.';
  await loginAs('manager');
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  row = page.getByRole('row').filter({ hasText: reason });
  await row.getByRole('button', { name: 'Approve as manager', exact: true }).click();
  await expect(row).toContainText('Pending HR');
  await expect(row.getByRole('button', { name: /Approve/ })).toHaveCount(0);

  journey.expectedState = 'HR final approval makes the decision immutable.';
  await loginAs('hr');
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  row = page.getByRole('row').filter({ hasText: reason });
  await row.getByRole('button', { name: 'Approve as HR', exact: true }).click();
  await expect(row).toContainText('Approved');
  await expect(row.getByRole('button')).toHaveCount(0);

  journey.expectedState = `Employee sees Approved and ${before - 2} days remaining, including after refresh.`;
  await loginAs('employee1');
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: reason })).toContainText('Approved');
  await expect(page.getByLabel('Available leave balance')).toHaveText(String(before - 2));
  await page.getByRole('button', { name: 'Refresh leave', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh leave', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Available leave balance')).toHaveText(String(before - 2));
  journey.observations.push(`Balance before=${before}; approved days=2; balance after=${before - 2}`);
});
