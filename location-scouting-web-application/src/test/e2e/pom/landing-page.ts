import { type Locator, type Page } from '@playwright/test';

export class LandingPage {
    readonly page: Page;
    readonly badge: Locator;
    readonly heading: Locator;
    readonly subheading: Locator;
    readonly signUpButton: Locator;
    readonly loginButton: Locator;
    readonly productionSnapshot: Locator;
    readonly productionLiveBadge: Locator;
    readonly scenesMetric: Locator;
    readonly matchesMetric: Locator;
    readonly gapsMetric: Locator;
    readonly lockedMetric: Locator;
    readonly quote: Locator;
    readonly featureCards: Locator;

    constructor(page: Page) {
        this.page = page;
        this.badge = page.getByTestId('landing-badge');
        this.heading = page.getByRole('heading', { name: 'Find the perfect location before the set is built.' });
        this.subheading = page.getByText('Locus Point helps productions compare locations, uncover keyword gaps, and keep scene coverage organized in one place.');
        this.signUpButton = page.getByTestId('landing-sign-up-button');
        this.loginButton = page.getByTestId('landing-login-button');
        this.productionSnapshot = page.getByTestId('landing-production-snapshot');
        this.productionLiveBadge = page.getByTestId('landing-production-live-badge');
        this.scenesMetric = page.getByTestId('landing-metric-scenes');
        this.matchesMetric = page.getByTestId('landing-metric-matches');
        this.gapsMetric = page.getByTestId('landing-metric-gaps');
        this.lockedMetric = page.getByTestId('landing-metric-locked');
        this.quote = page.getByText('“Urban rooftops and alley interiors are the strongest matches this week.”');
        this.featureCards = page.locator('[data-testid^="landing-feature-card-"]');
    }

    async goto() {
        await this.page.goto('/');
    }

    async openSignUp() {
        await this.signUpButton.click();
    }

    async openLogin() {
        await this.loginButton.click();
    }

    getFeatureCard(title: string) {
        const sanitizedTitle = title.toLowerCase().replace(/\s+/g, '-');
        return this.page.getByTestId(`landing-feature-card-${sanitizedTitle}`);
    }
}
