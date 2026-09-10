import { test, expect } from '@playwright/test'

test('unauthenticated user cannot reach a protected route', async ({ page }) => {
    await page.goto('/locations')
    await expect(page).toHaveURL('/')
})