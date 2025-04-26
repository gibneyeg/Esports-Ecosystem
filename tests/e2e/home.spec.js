const { test, expect } = require('@playwright/test');

test('homepage has title and navigation', async ({ page }) => {
    await page.goto('/');

    // header navigation is visible
    await expect(page.locator('header nav')).toBeVisible();


    await expect(page.locator('header nav ul a', { hasText: 'Home' })).toBeVisible();
    await expect(page.locator('header nav ul a', { hasText: 'LeaderBoard' })).toBeVisible();
    await expect(page.locator('[data-testid="nav-tournaments"]')).toBeVisible();
});

test('can navigate to tournaments page', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-testid="nav-tournaments"]').click();

    // Check we're on the tournaments page
    await expect(page).toHaveURL('/tournament');
    await expect(page.locator('h1')).toContainText('Esports Tournaments');
});