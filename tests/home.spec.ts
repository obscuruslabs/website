import { test, expect } from '@playwright/test';

test('home renders the full site when SITE_MODE=full', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /take back/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /viso/i }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /how it/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /questions/i })).toBeVisible();
});

test('clicking buy calls checkout and surfaces a stripe error on placeholder key', async ({
  page,
}) => {
  await page.goto('/');
  const buy = page.getByRole('button', { name: /buy now/i }).first();
  await buy.click();
  // Placeholder Stripe key causes a 500 and the button surfaces the error.
  await expect(page.getByText(/checkout failed|invalid api key/i)).toBeVisible({
    timeout: 10_000,
  });
});

test('waitlist submit returns success with no Resend key', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('you@domain.com').first().fill('ship@it.com');
  await page.getByRole('button', { name: /join waitlist/i }).first().click();
  await expect(page.getByText(/you're on the list/i)).toBeVisible();
});

test('legal pages render', async ({ page }) => {
  for (const path of ['/terms', '/privacy', '/returns', '/shipping', '/contact']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('robots.txt disallows when NOINDEX=true', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.ok()).toBeTruthy();
  const body = await res.text();
  expect(body).toContain('Disallow: /');
});
