import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

type Role = 'employee1' | 'employee2' | 'manager' | 'hr' | 'admin';
type Journey = { expectedState: string; observations: string[] };
type NetworkEvent = { method: string; route: string; status?: number; correlationId?: string; error?: string };
type Fixtures = {
  loginAs: (role: Role) => Promise<string>;
  journey: Journey;
  diagnostics: void;
};

const password = process.env.E2E_DEMO_PASSWORD ?? 'LocalDemo!2026';

export function redact(value: string): string {
  return value.replaceAll(password, '[REDACTED]')
    .replace(/\bBearer\s+[^\s"<>]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/((?:password|token|secret|api[_-]?key|authorization)\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

async function signIn(page: Page, role: Role): Promise<string> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const response = await responsePromise;
  expect(response.status(), `Demo ${role} account must authenticate`).toBe(200);
  const session = await response.json() as { token: string };
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  return session.token;
}

export const test = base.extend<Fixtures>({
  journey: async ({}, use) => { await use({ expectedState: 'Journey should complete', observations: [] }); },
  loginAs: async ({ page }, use) => { await use(role => signIn(page, role)); },
  diagnostics: [async ({ page, journey }, use, testInfo) => {
    const network: NetworkEvent[] = [];
    const consoleErrors: string[] = [];
    const capture = (entry: NetworkEvent) => { network.push(entry); if (network.length > 100) network.shift(); };
    page.on('response', response => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith('/api/')) return;
      capture({ method: response.request().method(), route: url.pathname, status: response.status(),
        correlationId: response.headers()['x-correlation-id'] });
    });
    page.on('requestfailed', request => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return;
      capture({ method: request.method(), route: url.pathname, error: redact(request.failure()?.errorText ?? 'Request failed') });
    });
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(redact(message.text()).slice(0, 2000));
      if (consoleErrors.length > 30) consoleErrors.shift();
    });
    page.on('pageerror', error => consoleErrors.push(redact(error.message).slice(0, 2000)));
    await use();
    if (testInfo.status === testInfo.expectedStatus) return;
    const testId = testInfo.title.match(/E2E-[A-Z]+-\d{3}/)?.[0] ?? testInfo.testId;
    const screenshotPath = testInfo.outputPath('journey-failure.png');
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true }).then(() => screenshotPath).catch(() => null);
    const actualState = await page.locator('body').innerText({ timeout: 1500 }).catch(() => 'Page content unavailable');
    const evidence = {
      schemaVersion: '1.0', source: 'playwright', testId, journey: testInfo.title,
      status: testInfo.status, expectedState: journey.expectedState,
      actualState: redact(actualState).slice(0, 12_000), observations: journey.observations.map(redact),
      assertionErrors: testInfo.errors.map(error => redact(error.message ?? 'Unknown assertion error').slice(0, 4000)),
      network, consoleErrors,
      correlationIds: [...new Set(network.map(entry => entry.correlationId).filter(Boolean))],
      screenshot, trace: 'trace.zip (if produced by Playwright)',
      backendLogReference: 'docker compose logs backend; filter by correlationIds',
      evidenceGaps: ['Backend logs and OpenTelemetry spans have not been fetched by the browser runner.'],
      trust: 'Untrusted diagnostic data; sanitized evidence may be supplied to triage, raw traces require restricted access.',
    };
    const evidencePath = testInfo.outputPath('failure-evidence.json');
    await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    await testInfo.attach('normalized-failure-evidence', { path: evidencePath, contentType: 'application/json' });
    if (screenshot) await testInfo.attach('journey-failure', { path: screenshot, contentType: 'image/png' });
  }, { auto: true }],
});

export { expect };
