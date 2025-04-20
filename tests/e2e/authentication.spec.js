const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
    test.describe('login page elements', () => {
        test('login page has correct elements', async ({ page }) => {
            // Navigate to the login page
            await page.goto('/login');

            // Wait for the page to load completely
            await page.waitForLoadState('networkidle');
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

    //  failed login
    test.describe('failed login', () => {
        test('failed login shows error message', async ({ page, context }) => {
            await context.clearCookies();

            await page.goto('/login');
            await page.waitForLoadState('networkidle');
            await page.locator('input[type="email"]').fill('wrong@example.com');
            await page.locator('input[type="password"]').fill('wrongpassword');
            await page.locator('button[type="submit"]').click();
            await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toBeVisible({ timeout: 10000 });

            await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toContainText(/Something went wrong|Invalid credentials/i);
        });
    });

    // Test for successful login
    test.describe('successful login and logout', () => {
        test('can log in and log out successfully', async ({ page, context }) => {
            // Clear cookies to ensure clean state
            await context.clearCookies();

            console.log('Starting login test');

            // Navigate to the login page
            await page.goto('/login');
            await page.waitForLoadState('networkidle');

            await page.locator('input[type="email"]').fill('john@example.com');
            await page.locator('input[type="password"]').fill('password123');


            // Submit the form
            await page.locator('button[type="submit"]').click();


            // Wait for navigation to complete after successful login
            await page.waitForNavigation({ timeout: 10000 });

            console.log('Navigation completed');

            await expect(page.locator('.profile-menu-container')).toBeVisible({ timeout: 10000 });


            // Click on the profile menu to open it
            await page.locator('.profile-menu-container button').click();


            await expect(page.locator('button', { hasText: 'Logout' })).toBeVisible({ timeout: 5000 });

            // Click the logout button
            await page.locator('button', { hasText: 'Logout' }).click();


            // Wait for redirect after logout
            await page.waitForNavigation({ timeout: 10000 });


            await expect(page.locator('a', { hasText: 'Log in' })).toBeVisible({ timeout: 5000 });
            await expect(page.locator('a', { hasText: 'Get started' })).toBeVisible();

        });
    });
});

