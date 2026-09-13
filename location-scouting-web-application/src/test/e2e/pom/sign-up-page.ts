import { type Locator, type Page } from '@playwright/test';


export class SignUpPage {

    readonly page: Page;
    readonly form: Locator;
    readonly nameInput: Locator;
    readonly nameInputError: Locator;
    readonly emailInput: Locator;
    readonly emailInputError: Locator;
    readonly formError: Locator;
    readonly passwordInput: Locator;
    readonly passwordInputError: Locator;
    readonly submitButton: Locator;
    readonly signInLink: Locator;

    constructor(page: Page) {
        this.page = page;
        this.form = page.getByTestId('signup-form');
        this.formError = this.form.getByTestId('signup-form-error');
        this.nameInput = this.form.getByTestId('signup-name-input');
        this.nameInputError = this.form.getByTestId('signup-name-error');
        this.emailInput = this.form.getByTestId('signup-email-input');
        this.emailInputError = this.form.getByTestId('signup-email-error');
        this.passwordInput = this.form.getByTestId('signup-password-input');
        this.passwordInputError = this.form.getByTestId('signup-password-error');
        this.submitButton = this.form.getByTestId('signup-submit-button');
        this.signInLink = page.getByTestId('signup-sign-in-link');
    }

    async goto() {
        await this.page.goto('/sign-up')
    }

    async signup(name: string, email: string, password: string) {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}