import { test, expect, Locator } from '@playwright/test'
import { setupUserWithLocations, signInSetup } from '@/test/e2e/fixtures'
import { LocationDetailPage } from '@/test/e2e/pom/location-detail-page'
import { LocationsPage } from '@/test/e2e/pom/locations-page'
import { addPhotosToLocation } from '@/services/locationPhotoService'
import { prisma } from '@/test/testDatabase'

// Photos live in a private bucket and reach the browser only through URLs the server presigns for the public storage
// endpoint. These tests prove the whole chain in a real browser: a URL signed for the wrong host, or with a bad
// signature, would leave a broken image that unit tests can't see.

// A 1x1 PNG: a real image, so the browser can decode it
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

/** Whether the browser downloaded and decoded the image. A refused or expired URL never gets this far. */
function isRendered(image: Locator) {
    return image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
}

test('when a user uploads a photo, it is displayed from private storage through a signed URL', async ({ page }) => {
    // GIVEN a signed-in user viewing one of their locations
    const { user, locations: [location] } = await setupUserWithLocations(1)
    await signInSetup(user, page)
    const detailPage = new LocationDetailPage(page)
    await detailPage.goto(location.id)

    // WHEN they upload a photo
    await detailPage.upload({ name: 'front.png', mimeType: 'image/png', buffer: PNG })
    await expect.poll(() => prisma.photo.count({ where: { locationId: location.id } })).toBe(1)

    // THEN the browser loads it. Reloading rather than waiting for the page to update itself: in production builds,
    // Next.js 16 sometimes leaves a server action's transition pending after revalidatePath, even though the action
    // succeeded (vercel/next.js discussion #82289). That affects every action on the page, not photo storage.
    await page.reload()
    await expect.poll(() => isRendered(detailPage.preview)).toBe(true)
    await expect.poll(() => isRendered(detailPage.thumbnails.getByRole('img'))).toBe(true)

    // AND only because the URL is signed: the same object without the signature is refused
    const url = new URL((await detailPage.preview.getAttribute('src'))!)
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy()
    const unsigned = await page.request.get(`${url.origin}${url.pathname}`)
    expect(unsigned.status()).toBe(403)
})

test('when a user views their locations, each shows its cover photo', async ({ page }) => {
    // GIVEN a signed-in user with a location that has a photo
    const { user, locations: [location] } = await setupUserWithLocations(1)
    const added = await addPhotosToLocation(user.userId, location.id, [
        { buffer: PNG, filename: 'cover.png', mimeType: 'image/png' },
    ], { db: prisma, labelDetector: async () => [] })
    expect(added.success).toBe(true)
    await signInSetup(user, page)

    // WHEN they open the locations list
    await new LocationsPage(page).goto()

    // THEN the location's cover photo loads
    const cover = page.getByRole('img', { name: location.name })
    await expect(cover).toBeVisible()
    await expect.poll(() => isRendered(cover)).toBe(true)
})
