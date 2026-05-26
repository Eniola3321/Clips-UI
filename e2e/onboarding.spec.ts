import { test, expect } from '@playwright/test';

test('Onboarding Flow E2E', async ({ page }) => {
  // 1. Navigate to home
  await page.goto('/');

  // 2. Sign up
  await page.getByText('Sign up free').click();
  await page.getByPlaceholder('Your full name').fill('Test User');
  await page.locator('#auth-email').fill(`test-${Date.now()}@example.com`);
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // 3. Wait for redirection to onboarding
  await expect(page).toHaveURL(/.*onboarding/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /Turn your long-form content into gold/i })).toBeVisible();

  // 4. Fill in step 1: Profile Setup
  await page.getByPlaceholder('e.g. alexrivera').fill('testuser');
  await page.locator('select').selectOption('gaming');
  await page.getByRole('button', { name: 'Continue to step 2' }).click({ force: true });

  // 5. Wait for step 2: Social Accounts  
  await expect(page.getByRole('heading', { name: 'Step 2: Connect your first social account' })).toBeVisible({ timeout: 15000 });

  // 6. Skip social connection
  await page.getByRole('button', { name: 'Skip for now' }).click({ force: true });

  // 7. Redirected to dashboard
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
});
