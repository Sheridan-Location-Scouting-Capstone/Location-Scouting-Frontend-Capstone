import { test, expect } from '@playwright/test';
import { LocationsPage } from "@/test/e2e/pom/locations-page";
import { SignUpPage } from "@/test/e2e/pom/sign-up-page";
import {createDefaultTestUser, signUpSetup} from "@/test/e2e/fixtures";


test('an unauthenticated user can sign up and is redirected to the locations page', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const locationsPage = new LocationsPage(page);
    const testUser = createDefaultTestUser();

    await signUpPage.goto();
    await signUpPage.signup(testUser.name, testUser.email, testUser.password);
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
})

test('an unauthenticated user cannot sign up with an existing email', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const testUser = await signUpSetup();

    await signUpPage.goto();
    await signUpPage.signup(testUser.name, testUser.email, testUser.password);
    await expect(signUpPage.emailInputError).toBeVisible();
})

test('an unauthenticated user cannot sign up with an invalid password', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const testUser = createDefaultTestUser();

    const shortPassword = 'a@1e';

    await signUpPage.goto();
    await signUpPage.signup(testUser.name, testUser.email, shortPassword);
    await expect(signUpPage.passwordInputError).toBeVisible();
})



