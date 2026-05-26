# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding.spec.ts >> Onboarding Flow E2E
- Location: e2e\onboarding.spec.ts:3:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*onboarding/
Received string:  "http://localhost:3000/login"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    4 × unexpected value "http://localhost:3000/"
    - waiting for" http://localhost:3000/login" navigation to finish...
    - navigated to "http://localhost:3000/login"
    15 × unexpected value "http://localhost:3000/login"

```

```yaml
- navigation:
  - link "⚡ ClipCash":
    - /url: /
  - link "Pricing":
    - /url: "#"
  - link "Showcase":
    - /url: "#"
  - link "Docs":
    - /url: "#"
  - link "Sign In":
    - /url: /login
  - link "Get Started":
    - /url: /signup
- main:
  - text: AI CLIPPING V2.0 IS LIVE
  - heading "Turn 1 long video into 100+ viral clips" [level=1]
  - paragraph: Preview, pick, post & mint — our AI-powered engine finds the high-retention moments for your viral growth across TikTok, Reels, and Shorts.
  - text: Video URL
  - textbox "Video URL":
    - /placeholder: Paste YouTube or Vimeo URL
  - button "Clip Now"
  - heading "Welcome back" [level=2]
  - paragraph: Log in to start creating viral content
  - button "Continue with Google":
    - img
    - text: Continue with Google
  - button "Continue with Apple":
    - img
    - text: Continue with Apple
  - text: OR EMAIL Email address
  - textbox "name@company.com"
  - text: Password
  - textbox "••••••••"
  - button "Continue with Email"
  - text: New here?
  - button "Sign up free"
- text: YOUTUBE TWITCH TIKTOK INSTA ⚡ ClipCash © 2024 ClipCash AI. All rights reserved.
- link "Privacy Policy":
  - /url: "#"
- link "Terms of Service":
  - /url: "#"
- link "Cookie Settings":
  - /url: "#"
- button "Open Tanstack query devtools":
  - img
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Onboarding Flow E2E', async ({ page }) => {
  4  |   // 1. Navigate to home
  5  |   await page.goto('/');
  6  | 
  7  |   // 2. Sign up
  8  |   await page.getByText('Sign up free').click();
  9  |   await page.getByPlaceholder('Your full name').fill('Test User');
  10 |   await page.locator('#auth-email').fill(`test-${Date.now()}@example.com`);
  11 |   await page.getByPlaceholder('••••••••').fill('password123');
  12 |   await page.getByRole('button', { name: 'Create Account' }).click();
  13 | 
  14 |   // 3. Wait for redirection to onboarding
> 15 |   await expect(page).toHaveURL(/.*onboarding/, { timeout: 10000 });
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  16 |   await expect(page.getByRole('heading', { name: /Turn your long-form content into gold/i })).toBeVisible();
  17 | 
  18 |   // 4. Fill in step 1: Profile Setup
  19 |   await page.getByPlaceholder('e.g. alexrivera').fill('testuser');
  20 |   await page.locator('select').selectOption('gaming');
  21 |   await page.getByRole('button', { name: 'Continue to step 2' }).click({ force: true });
  22 | 
  23 |   // 5. Wait for step 2: Social Accounts  
  24 |   await expect(page.getByRole('heading', { name: 'Step 2: Connect your first social account' })).toBeVisible({ timeout: 15000 });
  25 | 
  26 |   // 6. Skip social connection
  27 |   await page.getByRole('button', { name: 'Skip for now' }).click({ force: true });
  28 | 
  29 |   // 7. Redirected to dashboard
  30 |   await expect(page).toHaveURL(/.*dashboard/);
  31 |   await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  32 | });
  33 | 
```