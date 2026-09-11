import { type Locator, type Page } from '@playwright/test';
import {AuthenticatedHeader} from "@/test/e2e/pom/components/authenticated-header";

export class LocationsPage {

    readonly page: Page;
    readonly authenticatedHeader: AuthenticatedHeader;

    constructor(page: Page) {
        this.page = page;
        this.authenticatedHeader = new AuthenticatedHeader(page);
    }


}