// Alpha account recovery (LS-204): the sign-in page's contact note, and what the operator's reset does to a tester in
// the browser. The reset's other rules (unknown email, password strength) are covered by the integration tests.
//
// The reset runs here by calling resetPassword() in the test process, not by spawning the npm script. The fixtures
// already reach the app's database this way: global setup starts the Postgres container and sets DATABASE_URL before
// the workers start, the web server gets the same DATABASE_URL, and @/lib/auth (which signUpSetup uses, and which
// resetPassword uses by default) connects with it. So the test resets through the same Better Auth context and
// database as the app under test, and scripts/reset-password.ts is only a thin CLI wrapper around this call.

import { randomUUID } from 'node:crypto'
import { test, expect } from '@playwright/test'
import { PASSWORD_HELP_CONTACT } from '@/lib/alphaSupport'
import { resetPassword } from '@/maintenance/passwordReset'
import { LandingPage } from '@/test/e2e/pom/landing-page'
import { LocationsPage } from '@/test/e2e/pom/locations-page'
import { SignInPage } from '@/test/e2e/pom/sign-in-page'
import { SignUpPage } from '@/test/e2e/pom/sign-up-page'

test('the sign-in page tells a tester who forgot their password how to reach the operator', async ({ page }) => {
    const signInPage = new SignInPage(page)

    await signInPage.goto()

    await expect(signInPage.forgotPasswordNote).toBeVisible()
    await expect(signInPage.forgotPasswordNote).toHaveRole('complementary')
    await expect(signInPage.forgotPasswordNote).toHaveAccessibleName('Forgot your password?')
    await expect(signInPage.forgotPasswordNote).toContainText(PASSWORD_HELP_CONTACT)
})

test('after the operator resets their password, a tester signs in with the new one and not the old one', async ({ page }) => {
    // GIVEN a tester signed up and then signed out
    const tester = { name: 'Tess Tester', email: `reset-${randomUUID()}@example.com`, password: 'Old@password1' }
    const signUpPage = new SignUpPage(page)
    const locationsPage = new LocationsPage(page)
    const landingPage = new LandingPage(page)
    await signUpPage.goto()
    await signUpPage.signup(tester.name, tester.email, tester.password)
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible()
    await locationsPage.authenticatedHeader.signout()
    await landingPage.loginButton.waitFor()

    // WHEN the operator resets it
    const reset = await resetPassword(tester.email)
    if (!reset.success) throw new Error(`Reset failed: ${reset.error}`)
    const temporaryPassword = reset.data.generatedPassword!

    // THEN the old password is rejected with the page's usual error
    const signInPage = new SignInPage(page)
    await signInPage.goto()
    await signInPage.signin(tester.email, tester.password)
    await expect(signInPage.formError).toBeVisible()
    await expect(signInPage.submitButton).toBeEnabled()

    // AND the new one signs them in
    await signInPage.signin(tester.email, temporaryPassword)
    await expect(signInPage.form).not.toBeVisible()
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible()
})

test('when the operator resets a signed-in tester\'s password, their session ends', async ({ page }) => {
    // GIVEN a tester signed up and is still signed in
    const tester = { name: 'Tess Tester', email: `reset-${randomUUID()}@example.com`, password: 'Old@password1' }
    const signUpPage = new SignUpPage(page)
    const locationsPage = new LocationsPage(page)
    await signUpPage.goto()
    await signUpPage.signup(tester.name, tester.email, tester.password)
    await expect(locationsPage.authenticatedHeader.shell).toBeVisible()

    // WHEN the operator resets their password
    const reset = await resetPassword(tester.email)
    if (!reset.success) throw new Error(`Reset failed: ${reset.error}`)

    // THEN the same browser, still holding its session cookie, is sent to the guest landing page like any signed-out
    // visitor to a protected route
    const landingPage = new LandingPage(page)
    await locationsPage.goto()
    await expect(page).toHaveURL('/')
    await expect(locationsPage.authenticatedHeader.shell).not.toBeVisible()
    await expect(landingPage.loginButton).toBeVisible()
})
