import { test, expect } from '@playwright/test'
import { SignUpPage } from './pom/sign-up-page';
import { v4 as uuidv4 } from 'uuid';
import { LocationsPage } from "@/test/e2e/pom/locations-page";

test('unauthenticated user cannot reach a protected route', async ({ page }) => {
    await page.goto('/locations')
    await expect(page).toHaveURL('/')
})

test('an unauthenticated user can sign up and is redirected to the locations page', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const locationsPage = new LocationsPage(page);

    const testUser = {
        name: 'John Doe',
        email: 'example' + uuidv4().substring(0, 8) + '@test.com',
        password: 'Test@1234'
    }

    await signUpPage.goto();
    await signUpPage.signup(testUser.name, testUser.email, testUser.password);
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
})