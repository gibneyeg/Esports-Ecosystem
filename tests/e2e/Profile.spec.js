const { test, expect } = require('@playwright/test');

test.describe('User Profile', () => {
    // Store user details for test accounts
    const testUser = {
        email: 'john@example.com',
        password: 'password123'
    };

    const otherUser = {
        email: 'jane@example.com',
        password: 'password123'
    };

    // Helper function to log in a user
    async function login(page, email, password) {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.locator('button[type="submit"]').click();

        await page.waitForNavigation({ timeout: 10000 });

        await expect(page.locator('.profile-menu-container')).toBeVisible({ timeout: 10000 });
    }


    // Test viewing your own profile
    test('User can view and navigate to their own profile', async ({ page, context }) => {
        await context.clearCookies();

        await login(page, testUser.email, testUser.password);

        await page.locator('.profile-menu-container button').click();

        await page.locator('a', { hasText: 'Profile' }).click();

        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1, .profile-name')).toContainText(/John|Doe/i);

        await expect(page.locator('span').filter({ hasText: /Bronze|Silver|Gold|Platinum|Diamond|Master|Grandmaster/i }).first()).toBeVisible();

        // Check for points information 
        await expect(page.locator('span').filter({ hasText: /points/i }).first()).toBeVisible();


    });

    // Test privacy settings
    test('User can update privacy settings', async ({ page, context }) => {
        await context.clearCookies();

        // Login as test user
        await login(page, testUser.email, testUser.password);

        // Navigate to settings page
        await page.locator('.profile-menu-container button').click();
        await page.locator('a', { hasText: 'Settings' }).click();

        await page.waitForLoadState('networkidle');

        const privacyCheckbox = page.locator('#isProfilePrivate');
        const currentState = await privacyCheckbox.isChecked();

        // Toggle to opposite state
        if (currentState) {
            await privacyCheckbox.uncheck();
        } else {
            await privacyCheckbox.check();
        }

        await page.locator('button', { hasText: 'Save Privacy Settings' }).click();

        // Check for success message
        await expect(page.locator('.bg-green-50')).toBeVisible();
        await expect(page.locator('.bg-green-50')).toContainText('Privacy settings updated successfully');


    });

    // Test viewing another user's profile
    test('User can view another user\'s profile', async ({ page, context }) => {
        await context.clearCookies();

        await login(page, testUser.email, testUser.password);

        await page.goto('/leaderBoard');
        await page.waitForLoadState('networkidle');

        // Click on the first user that is not the current user
        const userLinks = page.locator('a').filter({ hasText: /^(?!.*John).*$/ }).first();

        // Store the username for later verification
        const otherUsername = await userLinks.textContent();

        await userLinks.click();

        await page.waitForLoadState('networkidle');

        // Verify we're viewing the correct user's profile
        await expect(page.locator('h1, .profile-name')).toContainText(otherUsername);

        await expect(page.locator('span').filter({ hasText: /Bronze|Silver|Gold|Platinum|Diamond|Master|Grandmaster/i }).first()).toBeVisible();
    });

    // Test profile visibility with private settings
    test('Private profiles show limited information to other users', async ({ browser }) => {
        const userContext = await browser.newContext();
        const userPage = await userContext.newPage();
        await userContext.clearCookies();
        await login(userPage, testUser.email, testUser.password);

        await userPage.locator('.profile-menu-container button').click();
        await userPage.getByRole('link', { name: 'Settings' }).click();
        await userPage.waitForLoadState('networkidle');

        // Enable private profile if not already
        const privacyCheckbox = userPage.locator('#isProfilePrivate');
        if (!(await privacyCheckbox.isChecked())) {
            await privacyCheckbox.check();
        }

        await userPage.getByRole('button', { name: 'Save Privacy Settings' }).click();
        await expect(userPage.locator('.bg-green-50')).toContainText('Privacy settings updated successfully');

        await userPage.locator('.profile-menu-container button').click();
        await userPage.getByRole('link', { name: 'Profile' }).click();
        await userPage.waitForLoadState('networkidle');
        const profileUrl = userPage.url();

        const otherUserContext = await browser.newContext();
        const otherUserPage = await otherUserContext.newPage();
        await otherUserContext.clearCookies();
        await login(otherUserPage, otherUser.email, otherUser.password);

        await otherUserPage.goto(profileUrl);
        await otherUserPage.waitForLoadState('networkidle');

        const tournamentSections = otherUserPage.locator('section, div').filter({ hasText: /Tournament/i });
        const sectionCount = await tournamentSections.count();

        let tournamentContent = '';
        if (sectionCount > 0) {
            tournamentContent = await tournamentSections.nth(0).textContent();
        }

        // Assert that private profiles don’t show tournaments
        const hasPrivacyIndicator = sectionCount === 0 ||
            tournamentContent.toLowerCase().includes('private') ||
            tournamentContent.toLowerCase().includes('hidden');

        expect(hasPrivacyIndicator).toBeTruthy();

        await userContext.close();
        await otherUserContext.close();
    });

});