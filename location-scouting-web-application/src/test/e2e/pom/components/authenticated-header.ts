import { type Locator, type Page } from '@playwright/test'

export class AuthenticatedHeader {

    readonly page: Page;
    readonly shell: Locator;

    constructor (page: Page) {
        this.page = page;
        this.shell = page.getByTestId('authenticated-shell')
    }
}