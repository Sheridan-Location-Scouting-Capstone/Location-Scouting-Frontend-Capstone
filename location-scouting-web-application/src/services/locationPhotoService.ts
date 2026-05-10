import {Photo, Prisma, PrismaClient} from "@prisma/client";
import {defaultBucket, deletePhoto, PhotoUploadResult, uploadPhoto, uploadPhotos} from "@/services/photoService";
import {Result} from "@/schemas/result";
import {PhotoUploadInput} from "@/schemas/photoUploadInput";
import {prisma} from "@/lib/prisma";
import { PhotoUpdateInput } from "@/schemas/photoUpdateInput";

export async function addPhotosToLocation(
    locationId: string,
    photoInput: PhotoUploadInput[],
    options?: { db?: PrismaClient, bucket?: string }):
    Promise<Result<Photo[]>>
{
    const db = options?.db ?? prisma
    const bucket = options?.bucket ?? defaultBucket

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

    const newKeywords = uploadedPhotos.flatMap(photo => photo.keywords ?? [])
    if (newKeywords.length > 0) {
        const existing = await db.location.findUnique({
            where: { id: locationId },
            select: { keywords: true }
        })
        const mergedKeywords = [...new Set([...existing?.keywords ?? [], ...newKeywords])].slice(0, 15)
        await db.location.update({
            where: { id: locationId },
            data: { keywords: mergedKeywords }
        })
    }

    return { success: true, data: result }
}

export async function removePhotosFromLocation(
    locationId: string,
    photoIds: string[],
    options?: { db?: PrismaClient, bucket?: string }): Promise<Result<void>>
{
    const db = options?.db ?? prisma
    const bucket = options?.bucket ?? defaultBucket

    let photos;
    if(photoIds.length > 0) {
        photos = await db.photo.findMany({
            where: {
                id: {in: photoIds},
                locationId: locationId
            }
        })
    } else {
        photos = await db.photo.findMany({
            where: { locationId: locationId }
        })
    }

    await Promise.all(photos.map(photo => deletePhoto(photo.storageKey, bucket)))
    if(photoIds.length > 0) {
        await db.photo.deleteMany({
            where: {
                id: {in: photos.map(p => p.id)},
                locationId: locationId
            }
        })
    } else {
        await db.photo.deleteMany({
            where: { locationId: locationId }
        })
    }

    return { success: true, data: undefined }
}

export async function updatePhoto(
    photoId: string,
    updateInput: PhotoUpdateInput,
    options?: { db? : PrismaClient }) : Promise<Result<any>>
{
    const db = options?.db ?? prisma

    try {
        const updated = await db.photo.update({
            where: { id: photoId },
            data: updateInput,
        })
        return { success: true, data: updated }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: 'Photo not found' }
        }
        throw error
    }
}

export async function updatePhotoDisplayOrder(
    locationId: string,
    orderedPhotoIds: string[],
    options?: { db?: PrismaClient }
): Promise<Result<void>> {
    const db = options?.db ?? prisma

    try {
        await db.$transaction(
            orderedPhotoIds.map((id, index) =>
                db.photo.update({
                    where: { id, locationId },
                    data: { displayOrder: index },
                })
            )
        )
        return { success: true, data: undefined }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: 'One or more photos do not belong to this location' }
        }
        throw error
    }
}