import { test, expect } from '@playwright/test'
import {signInSetup, signUpSetup} from "@/test/e2e/fixtures";
import {LocationsPage} from "@/test/e2e/pom/locations-page";

test('when an authenticated user signs out, they are redirected to the login page', async({page}) => {
    const testUser = await signUpSetup();
    await signInSetup({email: testUser.email, password: testUser.password}, page)

    const locationPage = new LocationsPage(page);
    locationPage.goto();


})


