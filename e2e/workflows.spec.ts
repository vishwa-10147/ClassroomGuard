import { test, expect, type Page } from '@playwright/test';

// Staff workflows on the seeded demo data (backend/seed_users.py, backend/seed_data.py).
const EMAIL = process.env.E2E_EMAIL ?? 'admin@classguard.dev';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Admin@12345';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('admin@university.edu').fill(EMAIL);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('incident: create, note, assign, resolve and reopen', async ({ page }) => {
  await login(page);
  await page.goto('/incidents');
  await page.getByRole('button', { name: 'Create Incident' }).click();

  const title = `E2E incident ${Date.now()}`;
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('What happened').fill('Phone seen under the desk at seat B4');
  await dialog.getByLabel('Severity').selectOption('high');
  await dialog.getByRole('button', { name: 'Create incident' }).click();

  await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.getByLabel('Add a note').fill('Spoke to the student; phone handed in.');
  await page.getByRole('button', { name: 'Add Note' }).click();
  await expect(page.getByText('Spoke to the student; phone handed in.')).toBeVisible();
  await expect(page.getByLabel('Add a note')).toHaveValue('');

  const reassign = page.getByLabel('Reassign');
  const firstPerson = await reassign.locator('option').nth(1).textContent();
  await reassign.selectOption({ index: 1 });
  await expect(page.getByText(`Assigned:${firstPerson}`)).toBeVisible();

  await page.getByRole('button', { name: 'Escalate' }).click();
  await expect(page.getByText('Escalated to critical severity.')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as Resolved' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByRole('button', { name: 'Mark as Resolved' })).toBeVisible();

  // The list finds it by search
  await page.goto('/incidents');
  await page.getByLabel('Search incidents').fill(title);
  await expect(page.getByRole('cell', { name: new RegExp(title) })).toBeVisible();
  await page.getByLabel('Search incidents').fill('no-such-incident-zzz');
  await expect(page.getByText('No incidents match')).toBeVisible();
});

test('alert: investigate opens the detection, escalate creates an incident', async ({ page }) => {
  await login(page);
  await page.goto('/alerts');
  await page.getByRole('tab', { name: /Active/ }).click();

  const investigate = page.getByRole('button', { name: 'Investigate' }).first();
  if (await investigate.count()) {
    await investigate.click();
    await expect(page).toHaveURL(/\/events\/.+/);
    await page.goBack();
  }

  await page.getByRole('button', { name: 'Escalate' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Escalate alert to an incident')).toBeVisible();
  await expect(dialog.getByLabel('Title')).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Create incident' }).click();
  await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]{36}$/);
});

test('recording: upload, cancel analysis and delete', async ({ page }) => {
  await login(page);
  await page.goto('/recordings');
  await page.getByRole('button', { name: 'Upload Video' }).click();

  const dialog = page.getByRole('dialog');
  const name = `E2E upload ${Date.now()}`;
  await dialog.getByLabel(/Video file/).setInputFiles({
    name: 'hall.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.concat([Buffer.from('00000018667479706d703432', 'hex'), Buffer.alloc(4096)]),
  });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row.getByText(/queued|processing/i)).toBeVisible();

  await row.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(row.getByText('cancelled', { exact: true })).toBeVisible();

  const download = row.getByRole('link', { name: 'Download' });
  await expect(download).toHaveAttribute('href', /\/recordings\/.+\/file\?token=.+&download=true/);

  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(row).toBeHidden();
});

test('events: search and filter the detection list', async ({ page }) => {
  await login(page);
  await page.goto('/events');
  await expect(page.getByRole('heading', { name: 'Detection Events' })).toBeVisible();
  await page.getByLabel('Search events').fill('no-such-thing-zzz');
  await expect(page.getByText('No detections match.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Search events')).toHaveValue('');
  const live = page.waitForRequest((r) => r.url().includes('/api/v1/events?') && r.url().includes('source=live'));
  await page.getByLabel('Source').selectOption('live');
  await live;
});

test('camera zones: draw a seat and save it', async ({ page }) => {
  await login(page);
  await page.goto('/cameras?zones=cam-004'); // seeded camera without a stream
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Zones: Side Camera')).toBeVisible();

  const surface = dialog.getByLabel('Zone drawing area');
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();

  const label = dialog.getByLabel('Label').last();
  await label.fill(`E2E-${Date.now() % 100000}`);
  const seatLabel = await label.inputValue();
  await dialog.getByRole('button', { name: 'Save zones' }).click();
  await expect(dialog).toBeHidden();

  const res = await page.request.get('/api/v1/cameras/cam-004', {
    headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}` },
  });
  const zones = (await res.json()).zones as { label: string; x: number; w: number }[];
  const saved = zones.find((z) => z.label === seatLabel)!;
  expect(saved).toBeTruthy();
  expect(saved.x).toBeCloseTo(0.1, 1);
  expect(saved.w).toBeCloseTo(0.2, 1);
});
