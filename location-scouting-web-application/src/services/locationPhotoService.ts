import {LocationStatus, Photo, PrismaClient} from "@prisma/client";
import {deletePhotos, storePhotos} from "@/services/photoService";
import {detectLabels, LabelDetector} from "@/services/visionService";
import {ErrorCode, fail, ok, Result} from "@/schemas/result";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import {prisma} from "@/lib/prisma";
import { PhotoUpdateInput } from "@/schemas/photoUpdateInput";
import {createLogger} from "@/lib/logger";
import {guard, isRecordNotFound} from "@/services/serviceResult";
import {getObjectStore, ObjectStore} from "@/infrastructure/storage";

const logger = createLogger('locationPhotoService')

// Photos belong to a location, and a location belongs to a user.
// Every operation first confirms the location is owned by the user before touching its photos.
async function userOwnsLocation(db: PrismaClient, userId: string, locationId: string): Promise<boolean> {
    const location = await db.location.findFirst({
        where: { id: locationId, userId, status: { not: LocationStatus.DELETED } },
        select: { id: true }
    })
    return location !== null
}

const locationNotFound = () => fail(ErrorCode.NOT_FOUND, 'Location not found')

export async function addPhotosToLocation(
    userId: string,
    locationId: string,
    photoInput: PhotoUploadInput[],
    options?: { db?: PrismaClient, objectStore?: ObjectStore, labelDetector?: LabelDetector }):
    Promise<Result<Photo[]>>
{
    const db = options?.db ?? prisma
    const labelDetector = options?.labelDetector ?? detectLabels

    return guard(logger, `add photos to location ${locationId}`, async () => {
        const objectStore = options?.objectStore ?? getObjectStore()

        if (!await userOwnsLocation(db, userId, locationId)) {
            return locationNotFound()
        }

        const stored = await storePhotos(userId, photoInput, { objectStore })
        if (!stored.success) return stored
        const keys = stored.data

        let result: Photo[]
        try {
            const existingCount = await db.photo.count({
                where: { locationId }
            })

            result = await db.photo.createManyAndReturn({
                data: keys.map((key, index) => ({
                    name: photoInput[index].name || photoInput[index].filename,
                    storageKey: key,
                    locationId: locationId,
                    displayOrder: photoInput[index].displayOrder ?? (existingCount + index)
                }))
            })
        } catch (error) {
            // Don't leave files in storage that no photo row points to
            await deletePhotos(keys, { objectStore })
            throw error
        }

        // Best-effort: a detector that fails returns no labels, so it never undoes a successful upload
        const labelsPerPhoto = await Promise.all(photoInput.map(photo => labelDetector(photo.buffer)))
        const newKeywords = labelsPerPhoto.flat()
        if (newKeywords.length > 0) {
            const existing = await db.location.findUnique({
                where: { id: locationId, userId },
                select: { keywords: true }
            })
            const mergedKeywords = [...new Set([...existing?.keywords ?? [], ...newKeywords])].slice(0, 15)
            await db.location.update({
                where: { id: locationId, userId },
                data: { keywords: mergedKeywords }
            })
        }

        return ok(result)
    })
}

export async function removePhotosFromLocation(
    userId: string,
    locationId: string,
    photoIds: string[],
    options?: { db?: PrismaClient, objectStore?: ObjectStore }): Promise<Result<void>>
{
    const db = options?.db ?? prisma

    return guard(logger, `remove photos from location ${locationId}`, async () => {
        const objectStore = options?.objectStore ?? getObjectStore()

        if (!await userOwnsLocation(db, userId, locationId)) {
            return locationNotFound()
        }

        let photos;
        if(photoIds.length > 0) {
            photos = await db.photo.findMany({
                where: {
                    id: {in: photoIds},
                    locationId: locationId,
                    location: { userId }
                }
            })
        } else {
            photos = await db.photo.findMany({
                where: { locationId: locationId, location: { userId } }
            })
        }

        // Files first: if storage fails, the rows stay and the delete can simply be retried
        const deleted = await deletePhotos(photos.map(photo => photo.storageKey), { objectStore })
        if (!deleted.success) return deleted

        await db.photo.deleteMany({
            where: {
                id: {in: photos.map(p => p.id)},
                locationId: locationId,
                location: { userId }
            }
        })

        return ok(undefined)
    })
}

export async function updatePhoto(
    userId: string,
    photoId: string,
    updateInput: PhotoUpdateInput,
    options?: { db? : PrismaClient }) : Promise<Result<Photo>>
{
    const db = options?.db ?? prisma

    return guard(logger, `update photo ${photoId}`, async () => {
        try {
            const updated = await db.photo.update({
                where: { id: photoId, location: { userId, status: { not: LocationStatus.DELETED } } },
                data: updateInput,
            })
            return ok(updated)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'Photo not found')
            }
            throw error
        }
    })
}

export async function updatePhotoDisplayOrder(
    userId: string,
    locationId: string,
    orderedPhotoIds: string[],
    options?: { db?: PrismaClient }
): Promise<Result<void>> {
    const db = options?.db ?? prisma

    return guard(logger, `reorder photos for location ${locationId}`, async () => {
        if (!await userOwnsLocation(db, userId, locationId)) {
            return locationNotFound()
        }

        try {
            await db.$transaction(
                orderedPhotoIds.map((id, index) =>
                    db.photo.update({
                        where: { id, locationId, location: { userId } },
                        data: { displayOrder: index },
                    })
                )
            )
            return ok(undefined)
        } catch (error) {
            if (isRecordNotFound(error)) {
                return fail(ErrorCode.NOT_FOUND, 'One or more photos do not belong to this location')
            }
            throw error
        }
    })
}
