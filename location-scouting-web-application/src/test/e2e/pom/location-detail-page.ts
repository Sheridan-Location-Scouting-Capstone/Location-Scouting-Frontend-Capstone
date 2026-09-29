import { expect, type Locator, type Page } from '@playwright/test';

export class LocationDetailPage {

    readonly page: Page;
    readonly uploadButton: Locator;
    readonly thumbnails: Locator;
    readonly preview: Locator;

    constructor(page: Page) {
        this.page = page;
        this.uploadButton = page.getByRole('button', { name: /upload photos|add photos/i });
        this.thumbnails = page.getByTestId('gallery-thumbnail');
        this.preview = page.getByTestId('gallery-preview');
    }

    async goto(locationId: string) {
        await this.page.goto(`/locations/${locationId}`);
    }

    // Through the button, as a user would: until React has hydrated, the button does nothing and the file input has no
    // change handler, so setting files directly can be silently lost. Retry until the file chooser opens.
    async upload(...files: { name: string, mimeType: string, buffer: Buffer }[]) {
        await expect(async () => {
            const fileChooser = this.page.waitForEvent('filechooser', { timeout: 1_000 });
            await this.uploadButton.click();
            await (await fileChooser).setFiles(files);
        }).toPass();
    }
}
