import { test, expect } from '@playwright/test';

test('reports readiness and persists an explicit theme', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Nx React + Nest starter' }),
  ).toBeVisible();
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();
});
