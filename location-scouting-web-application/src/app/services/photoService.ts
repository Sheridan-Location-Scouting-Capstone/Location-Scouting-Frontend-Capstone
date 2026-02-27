import * as Minio from 'minio'
import { PhotoUploadInput} from "@/app/schemas/photoUploadInput";


export type PhotoUploadResult = {
    url: string
    key: string
}


const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

export const defaultBucket = process.env.MINIO_BUCKET || 'location-photos'

export async function ensureBucketExists(bucketName = defaultBucket) {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
        await minioClient.makeBucket(bucketName)
    }
    await minioClient.setBucketPolicy(bucketName, JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
        }]
    }))
}

export async function uploadPhoto(
    input: PhotoUploadInput,
    bucketName = defaultBucket
): Promise<PhotoUploadResult> {
    await ensureBucketExists(bucketName)

    const key = `${Date.now()}-${input.filename}`

    await minioClient.putObject(
        bucketName,
        key,
        input.buffer,
        input.buffer.length,
        { 'Content-Type': input.mimeType }
    )

    const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${key}`

    return { url, key }
}

export async function uploadPhotos(
    inputs: PhotoUploadInput[],
    bucketName = defaultBucket
): Promise<PhotoUploadResult[]> {
    await ensureBucketExists(bucketName)
    return await Promise.all(inputs.map(input => uploadPhoto(input, bucketName)))
}

// export async function getPhoto(
//     key: string,
//
// ): Promise<>


export async function deletePhoto(key: string, bucketName = defaultBucket) {
    await minioClient.removeObject(bucketName, key)
}