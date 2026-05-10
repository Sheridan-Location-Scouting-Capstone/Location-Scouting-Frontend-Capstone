import * as Minio from 'minio'
import { PhotoUploadInput} from "@/schemas/photoUploadInput";
import vision from '@google-cloud/vision'

export type PhotoUploadResult = {
    url: string
    key: string
    keywords: string[]
}


const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

export const defaultBucket = process.env.MINIO_BUCKET || 'location-photos'

const visionClient = new vision.ImageAnnotatorClient()

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

    // Convert buffer to base64
    const base64Image = input.buffer.toString('base64')

    // Call Vision REST API with API key
    const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'LABEL_DETECTION', maxResults: 10 }]
                }]
            })
        }
    )

    const data = await response.json()
    const keywords = data.responses[0]?.labelAnnotations
        ?.filter((label: any) => label.score >= 0.8)
        ?.slice(0, 3)
        ?.map((label: any) => label.description) ?? []

    // console.log("Keywords:", keywords)

    return { url, key, keywords }
}

export async function uploadPhotos(
    inputs: PhotoUploadInput[],
    bucketName = defaultBucket
): Promise<PhotoUploadResult[]> {
    await ensureBucketExists(bucketName)
    return await Promise.all(inputs.map(input => uploadPhoto(input, bucketName)))
}

export async function deletePhoto(key: string, bucketName = defaultBucket) {
    await minioClient.removeObject(bucketName, key)
}