import { test, expect, Page } from '@playwright/test'
import { SignUpPage } from './pom/sign-up-page';
import { v4 as uuidv4 } from 'uuid';
import { LocationsPage } from "@/test/e2e/pom/locations-page";
import { SignInPage } from "@/test/e2e/pom/sign-in-page";
import { given } from "@/test/preconditions";
import { auth } from "@/lib/auth";
import { createDefaultTestUser, signUpSetup, signInSetup } from "./fixtures"


test('when an unauthenticated user attempts to reach a protected route, they are redirected to a guest-only route', async ({ page }) => {
    await page.goto('/locations')
    await expect(page).toHaveURL('/')
})

test('when a user signs in, they are redirected to an authenticated page', async({ page }) => {
    // GIVEN a user has signed up
    const userResponse = await signUpSetup()

    // AND is on sign in page
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    // WHEN the user logs in
    await signInPage.signin(userResponse.email, userResponse.password);

    // THEN they should be redirected to an authenticated page
    const locationsPage = new LocationsPage(page);
    await expect(signInPage.form).not.toBeVisible();
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
})

test('when a user attempts to sign with the wrong password, they are shown an error message', async({ page }) => {
    const user = await signUpSetup()

    // AND is on sign in page
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    // WHEN the user logs in with the wrong password
    await signInPage.signin(user.email, "wrongpassword")

    // THEN they should see an error message
    await expect(signInPage.formError).toBeVisible();
    await expect(signInPage.submitButton).toBeEnabled();
})

test('when a user attempts to sign in with non-existent user, they are shown an error message', async({ page }) => {
    const user = createDefaultTestUser();

    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.signin(user.email, user.password);

    await expect(signInPage.formError).toBeVisible();
    await expect(signInPage.submitButton).toBeEnabled();
})

test('when a user attempts to sign in without entering an email, they are shown an error message', async({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.signin('', 'Test@1234');
    await expect(signInPage.emailInputError).toBeVisible();
})

test('when a user attempts to sign in without entering a password, they are shown a password error message', async({ page }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto();

    await signInPage.signin('test@example.com', '');
    await expect(signInPage.passwordError).toBeVisible();
})

test('when an authenticated user navigates to a guest-only route, they are redirected to the authenticated screen', async({ page }) => {
    const testUser = await signUpSetup();
    await signInSetup({email: testUser.email, password: testUser.password}, page)

    const signInPage = new SignInPage(page);
    await signInPage.goto();

    const locationsPage = new LocationsPage(page);
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
    await expect(signInPage.form).not.toBeVisible();

    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
    await expect(signUpPage.form).not.toBeVisible();
})

