const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
    // Use a separate test.describe for each test case to ensure complete isolation
    test.describe('login page elements', () => {
        test('login page has correct elements', async ({ page }) => {
            // Navigate to the login page
            await page.goto('/login');

            // Wait for the page to load completely
            await page.waitForLoadState('networkidle');

            // Check that the page has the expected form elements
            await expect(page.locator('label', { hasText: 'Email' }).first()).toBeVisible();
            await expect(page.locator('label', { hasText: 'Password' }).first()).toBeVisible();
            await expect(page.locator('label', { hasText: 'Remember me' })).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toContainText('Sign In');

            // Check for social login options
            await expect(page.locator('button', { hasText: 'Sign in with Google' })).toBeVisible();
            await expect(page.locator('button', { hasText: 'Sign in with Discord' })).toBeVisible();

            // Check for the registration link
            await expect(page.locator('a', { hasText: /Don't have an account\?/ })).toBeVisible();
        });
    });

    // Separate test.describe for failed login
    test.describe('failed login', () => {
        test('failed login shows error message', async ({ page, context }) => {
            // Force clean context
            await context.clearCookies();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            // Fill in the form with incorrect credentials
            await page.locator('input[type="email"]').fill('wrong@example.com');
            await page.locator('input[type="password"]').fill('wrongpassword');

            // Submit the form
            await page.locator('button[type="submit"]').click();

            // Wait for the error message to appear
            await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toBeVisible({ timeout: 10000 });

            // Check that an error message is displayed
            await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toContainText(/Something went wrong|Invalid credentials/i);
        });
    });




});
