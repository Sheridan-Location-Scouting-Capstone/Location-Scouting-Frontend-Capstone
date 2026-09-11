import { test, expect } from '@playwright/test'
import { SignUpPage } from './pom/sign-up-page';
import { v4 as uuidv4 } from 'uuid';
import { LocationsPage } from "@/test/e2e/pom/locations-page";
import {SignInPage} from "@/test/e2e/pom/sign-in-page";

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

test('when a user signs in, they are redirected to an authenticated page', async({ page }) => {
    // GIVEN a user has signed up
    const testUser = {
        name: 'John Doe',
        email: 'example' + uuidv4().substring(0, 8) + '@test.com',
        password: 'Test@1234'
    }

    const response = await page.request.post('/api/auth/sign-up/email', {
        data: {
            name: testUser.name,
            email: testUser.email,
            password: testUser.password
        }
    });
    expect(response).toBeTruthy();
    expect(response?.status(), await response.text()).toBe(200);

    // AND isn't logged in
    const logoutResponse = await page.request.post('/api/auth/sign-out', { data: {}});
    expect(logoutResponse?.status(), await logoutResponse.text()).toBe(200);

    // AND is on sign in page
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    // WHEN the user logs in
    await signInPage.signin(testUser.email, testUser.password);

    // THEN they should be redirected to an authenticated page
    const locationsPage = new LocationsPage(page);
    await expect(signInPage.form).not.toBeVisible();
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
})