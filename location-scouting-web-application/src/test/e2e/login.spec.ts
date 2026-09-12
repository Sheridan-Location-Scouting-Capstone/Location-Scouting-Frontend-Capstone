import { test, expect } from '@playwright/test'
import { SignUpPage } from './pom/sign-up-page';
import { v4 as uuidv4 } from 'uuid';
import { LocationsPage } from "@/test/e2e/pom/locations-page";
import { SignInPage } from "@/test/e2e/pom/sign-in-page";
import { given } from "@/test/preconditions";
import { auth } from "@/lib/auth";


const createDefaultTestUser = () => ({
    name: "John Doe",
    email: "test+" + uuidv4().substring(0, 8) + "@example.com",
    password: "Test@1234",
});

const signUpSetup : (user?: any) => Promise<{ name: string; email: string; password: string }> = (async(user) => {
    const testUser = user ?? createDefaultTestUser();

    await given('a user exists', async() => {
        const { user } = await auth.api.signUpEmail({body: testUser})
        if(!user.id) throw new Error("User not created");
    })
    return testUser
})

test('unauthenticated user cannot reach a protected route', async ({ page }) => {
    await page.goto('/locations')
    await expect(page).toHaveURL('/')
})

test('an unauthenticated user can sign up and is redirected to the locations page', async ({ page }) => {
    const signUpPage = new SignUpPage(page);
    const locationsPage = new LocationsPage(page);
    const testUser = createDefaultTestUser();

    await signUpPage.goto();
    await signUpPage.signup(testUser.name, testUser.email, testUser.password);
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible();
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

