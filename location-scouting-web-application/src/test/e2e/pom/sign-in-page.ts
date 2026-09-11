import { type Locator, type Page } from '@playwright/test';

export class SignInPage {
    readonly page: Page;
    readonly form: Locator;
    readonly formError: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly signUpLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.form = page.getByTestId('signin-form');
        this.formError = this.form.getByTestId('signin-form-error');
        this.emailInput = this.form.getByTestId('signin-email-input');
        this.passwordInput = this.form.getByTestId('signin-password-input');
        this.submitButton = this.form.getByTestId('signin-submit-button');
        this.signUpLink = page.getByTestId('signin-signup-link');
    }

    async goto() {
        await this.page.goto('/sign-in');
    }

    async signin(email: string, password: string) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}
