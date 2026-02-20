import * as Minio from 'minio'

export type PhotoUploadInput = {
    buffer: Buffer
    filename: string
    mimeType: string
}

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

const bucket = process.env.MINIO_BUCKET || 'location-photos'

export async function ensureBucketExists(bucketName = bucket) {
    const exists = await minioClient.bucketExists(bucketName)
    if (!exists) {
        await minioClient.makeBucket(bucketName)
    }
}

export async function uploadPhoto(
    input: PhotoUploadInput,
    bucketName = bucket
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
    bucketName = bucket
): Promise<PhotoUploadResult[]> {
    await ensureBucketExists(bucketName)
    return await Promise.all(inputs.map(input => uploadPhoto(input, bucketName)))
}

export async function deletePhoto(key: string, bucketName = bucket) {
    await minioClient.removeObject(bucketName, key)
}