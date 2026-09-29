import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/test/setup'
import { revalidatePath } from 'next/cache'
import { LocationStatus } from '@prisma/client'
import * as locationActions from '@/actions/locationActions'
import {
    addPhotosAction,
    createLocationAction,
    deletePhotoAction,
    getLocationAction,
    getLocationsAction,
    removeKeywordAction,
    updateLocationAction,
    updateLocationStatusAction,
    updatePhotoDisplayOrderAction,
    updatePhotoNameAction,
} from '@/actions/locationActions'
import { createLocation } from '@/services/locationService'
import { signUpSetup } from '@/test/e2e/fixtures'
import { expectFailure, expectSuccess } from '@/test/helpers/result'
import { buildLocationInput } from '@/test/helpers/builders'
import { actAs, actAsAnonymous, everyExportedAction, expectRedirect, formDataFrom } from '@/test/helpers/actions'
import { ErrorCode } from '@/schemas/result'
import { Geocoder } from '@/schemas/geocoder'

vi.mock('@/lib/auth-session', () => ({ requireUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw Object.assign(new Error('NEXT_REDIRECT'), { url }) }) }))

const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })

// Photo rows are seeded directly rather than uploaded, so these tests don't depend on the Vision API
async function seedPhoto(locationId: string, name: string, displayOrder: number) {
    return prisma.photo.create({
        data: { locationId, name, displayOrder, storageKey: `seed-${locationId}-${name}` }
    })
}

describe('Location Actions', () => {
    let ownerId: string
    let intruderId: string
    let locationId: string

    beforeEach(async () => {
        vi.clearAllMocks()

        // Arrange - owner has one location with keywords; intruder is a separate user with nothing
        ownerId = (await signUpSetup()).userId
        intruderId = (await signUpSetup()).userId
        const location = await createLocation(ownerId, { ...buildLocationInput(), keywords: ['brick', 'alley'] }, { db: prisma, geocoder: mockGeocoder })
        if (!location.success) throw new Error(location.error)
        locationId = location.data.id

        actAs(ownerId)
    })

    describe('authentication', () => {
        it.each(everyExportedAction(locationActions))('%s should require a signed-in user', async (_name, action) => {
            // Arrange
            actAsAnonymous()

            // Act & Assert
            await expect(action('any-id', new FormData())).rejects.toThrow('UNAUTHENTICATED')
            expect(revalidatePath).not.toHaveBeenCalled()
        })
    })

    describe('getLocationsAction', () => {
        it('should return only the signed-in user\'s locations', async () => {
            // Arrange
            await createLocation(intruderId, buildLocationInput({ name: 'Intruder Spot' }), { db: prisma, geocoder: mockGeocoder })

            // Act
            const locations = expectSuccess(await getLocationsAction())

            // Assert
            expect(locations.map(l => l.id)).toEqual([locationId])
        })

        it('should not search another user\'s locations', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const locations = expectSuccess(await getLocationsAction('Downtown'))

            // Assert
            expect(locations).toHaveLength(0)
        })
    })

    describe('getLocationAction', () => {
        it('should return the signed-in user\'s location', async () => {
            // Act
            const location = expectSuccess(await getLocationAction(locationId))

            // Assert
            expect(location.id).toBe(locationId)
        })

        it('should return NOT_FOUND for another user\'s location', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure(await getLocationAction(locationId))

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
        })
    })

    describe('createLocationAction', () => {
        it('should create the location for the signed-in user and redirect to it', async () => {
            // Arrange
            const formData = formDataFrom({ ...buildLocationInput({ name: 'Fresh Spot' }), keywords: 'rooftop, urban' })

            // Act & Assert
            await expect(createLocationAction(formData)).rejects.toMatchObject({ message: 'NEXT_REDIRECT' })

            const created = await prisma.location.findFirst({ where: { name: 'Fresh Spot' } })
            expect(created!.userId).toBe(ownerId)
            expect(created!.keywords).toEqual(['rooftop', 'urban'])
            expect(revalidatePath).toHaveBeenCalledWith('/locations')
        })

        it('should return a validation failure without redirecting when the form is invalid', async () => {
            // Arrange
            const formData = formDataFrom({ ...buildLocationInput(), name: '' })

            // Act
            const result = expectFailure((await createLocationAction(formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(revalidatePath).not.toHaveBeenCalled()
        })
    })

    describe('updateLocationAction', () => {
        it('should update the signed-in user\'s location and redirect to it', async () => {
            // Arrange
            const formData = formDataFrom({ name: 'Renamed Alley' })

            // Act & Assert
            await expectRedirect(updateLocationAction(locationId, formData), `/locations/${locationId}`)
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.name).toBe('Renamed Alley')
        })

        it('should clear optional fields that are left empty', async () => {
            // Arrange - the location starts with a description and contact name
            await prisma.location.update({ where: { id: locationId }, data: { notes: 'Great light', contactName: 'Pat' } })
            const formData = formDataFrom({ ...buildLocationInput(), notes: '', contactName: '' })

            // Act & Assert
            await expectRedirect(updateLocationAction(locationId, formData), `/locations/${locationId}`)
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.notes).toBeNull()
            expect(location!.contactName).toBeNull()
        })

        it('should return a validation failure when a required field is cleared', async () => {
            // Arrange
            const formData = formDataFrom({ ...buildLocationInput(), name: '' })

            // Act
            const result = expectFailure((await updateLocationAction(locationId, formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
            expect(result.fieldErrors?.name).toBeDefined()
            expect(revalidatePath).not.toHaveBeenCalled()
        })

        it('should not update another user\'s location', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await updateLocationAction(locationId, formDataFrom({ name: 'Hijacked' })))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.name).not.toBe('Hijacked')
        })
    })

    describe('removeKeywordAction', () => {
        it('should remove a keyword from the signed-in user\'s location', async () => {
            // Act
            await removeKeywordAction(locationId, 'brick')

            // Assert
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toEqual(['alley'])
            expect(revalidatePath).toHaveBeenCalledWith(`/locations/${locationId}`)
        })

        it('should not remove a keyword from another user\'s location', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await removeKeywordAction(locationId, 'brick'))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toEqual(['brick', 'alley'])
        })
    })

    describe('updateLocationStatusAction', () => {
        it('should archive the signed-in user\'s location', async () => {
            // Act
            await updateLocationStatusAction(locationId, 'ARCHIVED')

            // Assert
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.status).toBe(LocationStatus.ARCHIVED)
        })

        it('should keep the location\'s keywords and country when the status changes', async () => {
            // Arrange
            await prisma.location.update({ where: { id: locationId }, data: { country: 'USA' } })

            // Act
            await updateLocationStatusAction(locationId, 'ARCHIVED')
            await updateLocationStatusAction(locationId, 'ACTIVE')

            // Assert
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.keywords).toEqual(['brick', 'alley'])
            expect(location!.country).toBe('USA')
        })

        it('should soft delete the signed-in user\'s location and redirect to the list', async () => {
            // Act & Assert
            await expectRedirect(updateLocationStatusAction(locationId, 'DELETED'), '/locations')
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.status).toBe(LocationStatus.DELETED)
        })

        it.each(['ARCHIVED', 'DELETED'] as const)('should not set another user\'s location to %s', async (status) => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await updateLocationStatusAction(locationId, status))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(revalidatePath).not.toHaveBeenCalled()
            const location = await prisma.location.findUnique({ where: { id: locationId } })
            expect(location!.status).toBe(LocationStatus.ACTIVE)
        })
    })

    describe('photo actions', () => {
        let photoIds: string[]

        beforeEach(async () => {
            const first = await seedPhoto(locationId, 'first.jpg', 0)
            const second = await seedPhoto(locationId, 'second.jpg', 1)
            photoIds = [first.id, second.id]
        })

        it('addPhotosAction should not add photos to another user\'s location', async () => {
            // Arrange
            actAs(intruderId)
            const formData = new FormData()
            formData.append('photos', new File([Buffer.from('intruder')], 'intruder.jpg', { type: 'image/jpeg' }))

            // Act
            const result = expectFailure((await addPhotosAction(locationId, formData))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(await prisma.photo.count({ where: { locationId } })).toBe(2)
        })

        it('deletePhotoAction should delete a photo from the signed-in user\'s location', async () => {
            // Act
            await deletePhotoAction(photoIds[0], locationId)

            // Assert
            const remaining = await prisma.photo.findMany({ where: { locationId } })
            expect(remaining.map(p => p.id)).toEqual([photoIds[1]])
        })

        it('deletePhotoAction should not delete a photo from another user\'s location', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await deletePhotoAction(photoIds[0], locationId))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            expect(await prisma.photo.count({ where: { locationId } })).toBe(2)
        })

        it('updatePhotoNameAction should rename a photo on the signed-in user\'s location', async () => {
            // Act
            await updatePhotoNameAction(photoIds[0], 'Front view', locationId)

            // Assert
            const photo = await prisma.photo.findUnique({ where: { id: photoIds[0] } })
            expect(photo!.name).toBe('Front view')
        })

        it('updatePhotoNameAction should not rename another user\'s photo', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await updatePhotoNameAction(photoIds[0], 'Hijacked', locationId))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const photo = await prisma.photo.findUnique({ where: { id: photoIds[0] } })
            expect(photo!.name).toBe('first.jpg')
        })

        it('updatePhotoDisplayOrderAction should reorder photos on the signed-in user\'s location', async () => {
            // Act
            await updatePhotoDisplayOrderAction(locationId, [photoIds[1], photoIds[0]])

            // Assert
            const ordered = await prisma.photo.findMany({ where: { locationId }, orderBy: { displayOrder: 'asc' } })
            expect(ordered.map(p => p.id)).toEqual([photoIds[1], photoIds[0]])
        })

        it('updatePhotoDisplayOrderAction should not reorder another user\'s photos', async () => {
            // Arrange
            actAs(intruderId)

            // Act
            const result = expectFailure((await updatePhotoDisplayOrderAction(locationId, [photoIds[1], photoIds[0]]))!)

            // Assert
            expect(result.code).toBe(ErrorCode.NOT_FOUND)
            const ordered = await prisma.photo.findMany({ where: { locationId }, orderBy: { displayOrder: 'asc' } })
            expect(ordered.map(p => p.id)).toEqual(photoIds)
        })
    })
})
