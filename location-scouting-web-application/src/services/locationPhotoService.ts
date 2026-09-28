import {LocationStatus, Photo, Prisma, PrismaClient} from "@prisma/client";
import {defaultBucket, deletePhoto, uploadPhotos} from "@/services/photoService";
import {detectLabels, LabelDetector} from "@/services/visionService";
import {ErrorCode, Result} from "@/schemas/result";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import {prisma} from "@/lib/prisma";
import { PhotoUpdateInput } from "@/schemas/photoUpdateInput";

// Photos belong to a location, and a location belongs to a user.
// Every operation first confirms the location is owned by the user before touching its photos.
async function userOwnsLocation(db: PrismaClient, userId: string, locationId: string): Promise<boolean> {
    const location = await db.location.findFirst({
        where: { id: locationId, userId, status: { not: LocationStatus.DELETED } },
        select: { id: true }
    })
    return location !== null
}

const locationNotFound = { success: false, code: ErrorCode.NOT_FOUND, error: 'Location not found' } as const

export async function addPhotosToLocation(
    userId: string,
    locationId: string,
    photoInput: PhotoUploadInput[],
    options?: { db?: PrismaClient, bucket?: string, labelDetector?: LabelDetector }):
    Promise<Result<Photo[]>>
{
    const db = options?.db ?? prisma
    const bucket = options?.bucket ?? defaultBucket
    const labelDetector = options?.labelDetector ?? detectLabels

    if (!await userOwnsLocation(db, userId, locationId)) {
        return locationNotFound
    }

    const uploadedPhotos = await uploadPhotos(photoInput, bucket)

    const existingCount = await db.photo.count({
        where: { locationId }
    })

    const result = await db.photo.createManyAndReturn({
        data: uploadedPhotos.map((result, index) => ({
            name: photoInput[index].name || photoInput[index].filename,
            url: result.url,
            storageKey: result.key,
            locationId: locationId,
            displayOrder: photoInput[index].displayOrder ?? (existingCount + index)
        }))
    })

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

    return { success: true, data: result }
}

export async function removePhotosFromLocation(
    userId: string,
    locationId: string,
    photoIds: string[],
    options?: { db?: PrismaClient, bucket?: string }): Promise<Result<void>>
{
    const db = options?.db ?? prisma
    const bucket = options?.bucket ?? defaultBucket

    if (!await userOwnsLocation(db, userId, locationId)) {
        return locationNotFound
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

    await Promise.all(photos.map(photo => deletePhoto(photo.storageKey, bucket)))
    await db.photo.deleteMany({
        where: {
            id: {in: photos.map(p => p.id)},
            locationId: locationId,
            location: { userId }
        }
    })

    return { success: true, data: undefined }
}

export async function updatePhoto(
    userId: string,
    photoId: string,
    updateInput: PhotoUpdateInput,
    options?: { db? : PrismaClient }) : Promise<Result<Photo>>
{
    const db = options?.db ?? prisma

    try {
        const updated = await db.photo.update({
            where: { id: photoId, location: { userId, status: { not: LocationStatus.DELETED } } },
            data: updateInput,
        })
        return { success: true, data: updated }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, code: ErrorCode.NOT_FOUND, error: 'Photo not found' }
        }
        throw error
    }
}

export async function updatePhotoDisplayOrder(
    userId: string,
    locationId: string,
    orderedPhotoIds: string[],
    options?: { db?: PrismaClient }
): Promise<Result<void>> {
    const db = options?.db ?? prisma

    if (!await userOwnsLocation(db, userId, locationId)) {
        return locationNotFound
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
        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, code: ErrorCode.NOT_FOUND, error: 'One or more photos do not belong to this location' }
        }
        throw error
    }
}
