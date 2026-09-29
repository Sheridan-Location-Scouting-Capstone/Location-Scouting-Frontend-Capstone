import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { objectStoreTestEnv } from '@/test/containers'

// Direct access to the Garage test container's bucket, for what the app's ObjectStore deliberately can't do (listing
// everything). Built from the fixed test settings rather than the environment, so it can only ever touch the test bucket.

const storage = objectStoreTestEnv()

export const testBucket = storage.OBJECT_STORE_BUCKET
export const testStorageUrl = storage.OBJECT_STORE_ENDPOINT

const client = new S3Client({
    endpoint: storage.OBJECT_STORE_ENDPOINT,
    region: storage.OBJECT_STORE_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: storage.OBJECT_STORE_ACCESS_KEY_ID, secretAccessKey: storage.OBJECT_STORE_SECRET_ACCESS_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
})

export async function listTestBucket(): Promise<string[]> {
    const keys: string[] = []
    let continuationToken: string | undefined
    do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: testBucket, ContinuationToken: continuationToken }))
        keys.push(...(page.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : [])))
        continuationToken = page.NextContinuationToken
    } while (continuationToken)
    return keys
}

export async function emptyTestBucket() {
    const keys = await listTestBucket()
    await Promise.all(keys.map((key) => client.send(new DeleteObjectCommand({ Bucket: testBucket, Key: key }))))
}
