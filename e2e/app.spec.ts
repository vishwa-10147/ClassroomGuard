import { test, expect } from '@playwright/test';

test('has title and renders app shell', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the main page to load
  // If there's a specific title we could assert it, otherwise let's just make sure it loads.
  await expect(page).toHaveTitle(/.*ClassroomGuard.*/i);
});
