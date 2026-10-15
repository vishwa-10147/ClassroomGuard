import { test, expect, type Page } from '@playwright/test';

// Seeded demo account (backend/seed_users.py). Override for other environments.
const EMAIL = process.env.E2E_EMAIL ?? 'admin@classguard.dev';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@12345';

const PAGES = [
  '/dashboard',
  '/live',
  '/cameras',
  '/classrooms',
  '/recordings',
  '/evidence',
  '/events',
  '/alerts',
  '/incidents',
  '/reports',
  '/users',
  '/roles',
  '/audit-logs',
  '/settings',
];

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('admin@university.edu').fill(EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/ClassroomGuard/i);
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
});

test('rejects a wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('admin@university.edu').fill(EMAIL);
  await page.getByPlaceholder('Enter your password').fill('definitely-wrong-password');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login/);
});

test('forgot password sends a neutral confirmation', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await page.getByPlaceholder('you@college.edu').fill('nobody@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
});

test('reset page rejects an invalid link', async ({ page }) => {
  await page.goto('/reset-password?token=not-a-real-token');
  await page.getByLabel('New password', { exact: true }).fill('Long-Enough-Pass-1');
  await page.getByLabel('Confirm new password').fill('Long-Enough-Pass-1');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
});

test('every page loads without API errors or crashes', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (res) => {
    // Offline / unconfigured cameras answer 400/503 on snapshot and stream: not an app error
    const cameraFeed = /\/cameras\/[^/]+\/(snapshot|stream)/.test(res.url()) && [400, 503].includes(res.status());
    if (res.url().includes('/api/') && res.status() >= 400 && !cameraFeed) {
      failures.push(`${res.request().method()} ${new URL(res.url()).pathname} -> ${res.status()}`);
    }
  });
  page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));

  await login(page);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path));
    await expect(page.locator('main')).not.toBeEmpty();
    await page.waitForLoadState('networkidle');
  }
  expect(failures).toEqual([]);
});

test('live updates socket connects after login', async ({ page }) => {
  const connected = page.waitForEvent('websocket', (ws) => ws.url().includes('/ws?token='));
  await login(page);
  const ws = await connected;
  expect(ws.isClosed()).toBe(false);
});
