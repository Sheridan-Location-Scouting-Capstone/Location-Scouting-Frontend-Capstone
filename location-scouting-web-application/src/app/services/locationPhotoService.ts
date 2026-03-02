import {Photo, Prisma, PrismaClient} from "@prisma/client";
import {defaultBucket, deletePhoto, PhotoUploadResult, uploadPhoto, uploadPhotos} from "@/app/services/photoService";
import {Result} from "@/app/schemas/result";
import {PhotoUploadInput} from "@/app/schemas/photoUploadInput";
import {prisma} from "@/app/lib/prisma";


export async function addPhotosToLocation(
    locationId: string,
    photoInput: PhotoUploadInput[],
    options?: { db?: PrismaClient, bucket?: string }):
    Promise<Result<Photo[]>>
{
    const db = options?.db ?? prisma
    const bucket = options?.bucket ??  defaultBucket

    const uploadedPhotos = await uploadPhotos(photoInput, bucket)

    const result = await db.photo.createManyAndReturn({
        data: uploadedPhotos.map((result, index) => ({
            name: photoInput[index].filename,
            url: result.url,
            storageKey: result.key,
            locationId: locationId,
            displayOrder: index
        }))
    })

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

// export async function updatePhotoDisplayOrder(
//     locationId: string,
//     photoOrder: { photoId: string, displayOrder: number }[],
//     options?: { db?: PrismaClient }
// ): Promise<Result<void>> {
//     const db = options?.db ?? prisma)
//
//
// }