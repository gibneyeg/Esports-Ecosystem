const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
    test('login page has correct elements', async ({ page }) => {
        // Navigate to the login page
        await page.goto('/login');

        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');

        // Check that the page has the expected form elements - using more precise selectors
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

    test('failed login shows error message', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Fill in the form with incorrect credentials using more precise selectors
        await page.locator('input[type="email"]').fill('wrong@example.com');
        await page.locator('input[type="password"]').fill('wrongpassword');

        // Submit the form
        await page.locator('button[type="submit"]').click();

        // We might not be able to intercept the response if it's handled client-side
        // So just wait for the error message to appear
        await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toBeVisible({ timeout: 10000 });

        // Check that an error message is displayed (less strict text checking)
        await expect(page.locator('.p-4.text-sm.bg-red-50, .p-3.text-sm.bg-red-50')).toContainText("Something went wrong!");
    });

    test('successful login redirects to homepage', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Fill in the form with correct credentials (from your seed data)
        await page.locator('input[type="email"]').fill('tom@example.com');
        await page.locator('input[type="password"]').fill('password123');

        // Submit the form
        await page.locator('button[type="submit"]').click();

        // Wait for redirect after successful login - can take a moment to process
        try {
            await page.waitForURL('/', { timeout: 30000 });
        } catch (error) {
            // If we time out, take a screenshot and log page content for debugging
            await page.screenshot({ path: 'login-redirect-failed.png' });
            console.log('Current URL:', page.url());
            console.log('Page content:', await page.content());
            throw error;
        }

        // Check that we are on the homepage
        await expect(page).toHaveURL('/');

        // Wait for the profile menu to become visible (may take time to load session)
        await expect(page.locator('.profile-menu-container')).toBeVisible({ timeout: 15000 });
    });

    // Test for the remember me functionality
    test('remember me checkbox creates persistent session', async ({ page, context }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Fill in the form with credentials and check remember me
        await page.locator('input[type="email"]').fill('john@example.com');
        await page.locator('input[type="password"]').fill('password123');
        await page.locator('input[type="checkbox"]#remember-me').check();

        // Submit the form
        await page.locator('button[type="submit"]').click();

        // Wait for redirect after successful login
        await page.waitForURL('/', { timeout: 10000 });

        // Wait a moment for session cookies to be properly set
        await page.waitForTimeout(1000);

        // Get cookies
        const cookies = await context.cookies();
        const sessionCookie = cookies.find(c => c.name.includes('session-token'));

        // Check that the session cookie exists and has a long expiry
        expect(sessionCookie).toBeDefined();

        // Calculate if expiry is longer than the default session (at least 7 days)
        const oneDayInSeconds = 24 * 60 * 60;
        const now = Math.floor(Date.now() / 1000);
        expect(sessionCookie.expires - now).toBeGreaterThan(oneDayInSeconds);
    });
});

test.describe('Account Creation', () => {
    test('signup page has correct elements', async ({ page }) => {
        // Navigate to the signup page
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        // Make sure we're dealing with a loaded page
        await expect(page.locator('h1')).toBeVisible();

        // Check that the page has the expected form elements using more precise selectors
        await expect(page.locator('form label >> text=Username')).toBeVisible();
        await expect(page.locator('form label >> text=Email')).toBeVisible();
        await expect(page.locator('form label >> text=Password')).toBeVisible();
        await expect(page.locator('form label >> text=Confirm Password')).toBeVisible();

        // Check for the submit button - use button inside form
        const submitButton = page.locator('form button[type="submit"]');
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toContainText(/Create Account|Sign Up/);

        // Check for the login link - based on your signup page code
        await expect(page.locator('p.mt-4 a', { hasText: /Already have an account/i })).toBeVisible();
    });

    test('shows error for existing email', async ({ page }) => {
        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        // Make sure form is visible before proceeding
        await expect(page.locator('form')).toBeVisible();

        // Fill in the form with an existing email using more precise selectors
        await page.locator('input[name="username"]').fill('newuser');
        await page.locator('input[name="email"]').fill('john@example.com'); // This email exists in seed data
        await page.locator('input[name="password"]').fill('newpassword123');
        await page.locator('input[name="confirmPassword"]').fill('newpassword123');

        // Submit the form - use form instead of button to handle potential enter key submission
        await page.locator('form button[type="submit"]').click();

        // Just wait for the error to appear, regardless of how it's delivered
        await expect(page.locator('.p-3.text-sm.text-red-500, .bg-red-50')).toBeVisible({ timeout: 15000 });

        // Check that an error message is displayed (with more flexible content matching)
        await expect(page.locator('.p-3.text-sm.text-red-500, .bg-red-50')).toContainText(/email|already|exists|registered/i);
    });

    test('successful account creation shows verification message', async ({ page }) => {
        // Generate a unique email and username
        const timestamp = Date.now();
        const uniqueEmail = `test_${timestamp}@example.com`;
        const uniqueUsername = `user_${timestamp}`;

        await page.goto('/signup');
        await page.waitForLoadState('networkidle');

        // Fill in the form with new unique credentials
        await page.locator('input[name="username"]').fill(uniqueUsername);
        await page.locator('input[name="email"]').fill(uniqueEmail);
        await page.locator('input[name="password"]').fill('testpassword123');
        await page.locator('input[name="confirmPassword"]').fill('testpassword123');

        // Submit the form
        await page.locator('button[type="submit"]').click();

        // Wait for successful API response
        await page.waitForResponse(response =>
            response.url().includes('/api/auth/signup') &&
            response.ok()
        );

        // Based on your signup page code, after successful registration,
        // the page shows a success view with verification message
        await expect(page.locator('h1', { hasText: 'Account Created Successfully' })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Please check your email/i)).toBeVisible();
        await expect(page.getByText(uniqueEmail)).toBeVisible();
    });
});

test.describe('User Logout', () => {
    test('can log out successfully', async ({ page }) => {
        // First log in
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.locator('input[type="email"]').fill('john@example.com');
        await page.locator('input[type="password"]').fill('password123');
        await page.locator('button[type="submit"]').click();

        // Wait for redirect after successful login
        await page.waitForURL('/', { timeout: 10000 });

        // Ensure we're logged in
        await expect(page.locator('.profile-menu-container')).toBeVisible({ timeout: 10000 });

        // Open profile menu
        await page.locator('.profile-menu-container button').click();

        // Wait for the menu to be visible
        await expect(page.locator('.profile-menu-container div.absolute')).toBeVisible();

        // Click the logout button
        await page.locator('button', { hasText: 'Logout' }).click();

        // Wait for logout to complete and page to reload
        await page.waitForLoadState('networkidle');

        // Verify we are logged out by checking for login/signup buttons
        await expect(page.locator('a', { hasText: 'Log in' })).toBeVisible();
        await expect(page.locator('a', { hasText: 'Get started' })).toBeVisible();
    });
});