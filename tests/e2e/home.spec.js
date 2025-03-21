const { test, expect } = require('@playwright/test');

test('homepage has title and navigation', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Assert that the header navigation is visible
    await expect(page.locator('header nav')).toBeVisible();

    // Instead of using getByRole for navigation links, use more specific selectors
    // Check for links in the header navigation
    await expect(page.locator('header nav ul a', { hasText: 'Home' })).toBeVisible();
    await expect(page.locator('header nav ul a', { hasText: 'LeaderBoard' })).toBeVisible();
    await expect(page.locator('[data-testid="nav-tournaments"]')).toBeVisible();
});

test('can navigate to tournaments page', async ({ page }) => {
    // Go to homepage
    await page.goto('/');

    // Click on the tournaments link using the data-testid
    await page.locator('[data-testid="nav-tournaments"]').click();

    // Check we're on the tournaments page
    await expect(page).toHaveURL('/tournament');
    await expect(page.locator('h1')).toContainText('Esports Tournaments');
});