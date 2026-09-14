import { test, expect } from '@playwright/test'
import {signInSetup, signUpSetup} from "@/test/e2e/fixtures";
import {LocationsPage} from "@/test/e2e/pom/locations-page";
import {AuthenticatedHeader} from "@/test/e2e/pom/components/authenticated-header";
import {LandingPage} from "@/test/e2e/pom/landing-page";

test('when an authenticated user signs out, they are redirected to the login page', async({page}) => {
    const testUser = await signUpSetup();
    await signInSetup({email: testUser.email, password: testUser.password}, page)
    const locationPage = new LocationsPage(page);
    const landingPage = new LandingPage(page);

    await locationPage.goto();
    await locationPage.authenticatedHeader.signout();

    await expect(locationPage.authenticatedHeader.shell).not.toBeVisible();
    await expect(landingPage.signUpButton).toBeVisible();
})

test('when an authenticated user signs out, they are no longer able to access protected routes', async({page}) => {
    const testUser = await signUpSetup();
    await signInSetup({email: testUser.email, password: testUser.password}, page)
    const locationPage = new LocationsPage(page);
    const landingPage = new LandingPage(page);

    await locationPage.goto();
    await locationPage.authenticatedHeader.signout();

    await landingPage.loginButton.waitFor();
    await locationPage.goto();
    await expect(locationPage.authenticatedHeader.shell).not.toBeVisible();
    await expect(page).toHaveURL('/');
})


