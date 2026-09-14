import { type Locator, type Page } from '@playwright/test'

export class AuthenticatedHeader {

    readonly page: Page;
    readonly shell: Locator;
    readonly userMenuButton: Locator;
    readonly userMenuName: Locator;
    readonly userMenuEmail: Locator;
    readonly signOutButton: Locator;

    constructor (page: Page) {
        this.page = page;
        this.shell = page.getByTestId('authenticated-shell');
        this.userMenuButton = page.getByTestId('user-menu-button');
        this.userMenuName = page.getByTestId('user-menu-name');
        this.userMenuEmail = page.getByTestId('user-menu-email');
        this.signOutButton = page.getByTestId('user-menu-signout');
    }
}