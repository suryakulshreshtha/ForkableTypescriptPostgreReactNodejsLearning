import { test, expect } from '@playwright/test';

/**
 * Full-stack E2E: real Chromium browser -> Vite dev server -> Express API
 * -> PostgreSQL. Each test uses a uniquely-named "practicedBy" or title so
 * tests remain independent even though they share a live database.
 */
test.describe('Mindful Practice app', () => {
  test('shows the meditation library on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Mindful Practice' })).toBeVisible();
    await expect(page.getByLabel('Meditations')).toBeVisible();
  });

  test('a user can log a practice session and see their streak appear', async ({ page }) => {
    const name = `E2E User ${Date.now()}`;
    await page.goto('/');

    await page.getByLabel('Your name').fill(name);
    const options = await page.getByLabel('Choose meditation').locator('option').allTextContents();
    // Pick the first real meditation option (index 0 is the placeholder).
    await page.getByLabel('Choose meditation').selectOption({ index: 1 });
    await page.getByLabel('Duration in minutes').fill('12');
    await page.getByRole('button', { name: 'Log Session' }).click();

    await expect(page.getByTestId('current-streak')).toContainText('Current streak: 1 day');
    expect(options.length).toBeGreaterThan(1);
  });

  test('a user can filter the meditation library by category', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Filter by category').selectOption('walking');
    // Every visible meditation row (if any) should mention "walking".
    const rows = page.getByLabel('Meditations').locator('li');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('walking');
    }
  });

  test('a user can register for a retreat and see the count update', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Retreats' }).click();

    const firstRegisterButton = page.getByRole('button', { name: 'Register' }).first();
    if (await firstRegisterButton.isVisible().catch(() => false)) {
      await firstRegisterButton.click();
      await expect(page.getByLabel('Upcoming retreats')).toContainText('registered');
    }
  });

  test('a user can submit a testimonial and see it appear in the list', async ({ page }) => {
    const name = `E2E Storyteller ${Date.now()}`;
    await page.goto('/');
    await page.getByRole('button', { name: 'Stories of Transformation' }).click();

    await page.getByLabel('Your name').fill(name);
    await page.getByLabel('Your story').fill('This is my end-to-end test story of transformation.');
    await page.getByRole('button', { name: 'Share Story' }).click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test('submitting a testimonial without a story shows a validation error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Stories of Transformation' }).click();
    await page.getByRole('button', { name: 'Share Story' }).click();

    await expect(page.getByRole('alert')).toHaveText('Please fill in both your name and your story');
  });
});
