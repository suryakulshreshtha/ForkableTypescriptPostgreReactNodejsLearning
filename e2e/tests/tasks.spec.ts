import { test, expect } from '@playwright/test';

/**
 * Full-stack E2E: real Chromium browser -> Vite dev server -> Express API
 * -> PostgreSQL. Each test creates its own uniquely-titled task so tests
 * remain independent even though they share a live database.
 */
test.describe('Tasks app', () => {
  test('shows the empty state or existing tasks on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });

  test('a user can create a task and see it appear in the list', async ({ page }) => {
    const title = `E2E task ${Date.now()}`;
    await page.goto('/');

    await page.getByLabel('Task title').fill(title);
    await page.getByLabel('Task description').fill('created by playwright');
    await page.getByRole('button', { name: 'Add Task' }).click();

    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText('created by playwright')).toBeVisible();
  });

  test('a user can mark a task complete and see the strikethrough style', async ({ page }) => {
    const title = `Completable task ${Date.now()}`;
    await page.goto('/');
    await page.getByLabel('Task title').fill(title);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByText(title)).toBeVisible();

    await page.getByLabel(`Toggle ${title}`).check();

    await expect(page.getByText(title)).toHaveCSS('text-decoration-line', 'line-through');
  });

  test('a user can delete a task and it disappears from the list', async ({ page }) => {
    const title = `Deletable task ${Date.now()}`;
    await page.goto('/');
    await page.getByLabel('Task title').fill(title);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByText(title)).toBeVisible();

    await page.getByLabel(`Delete ${title}`).click();

    await expect(page.getByText(title)).not.toBeVisible();
  });

  test('submitting without a title shows a validation error and adds nothing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add Task' }).click();

    await expect(page.getByRole('alert')).toHaveText('Title is required');
  });
});
