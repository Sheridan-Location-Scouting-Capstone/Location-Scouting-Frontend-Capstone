// Object storage configuration, read from the environment and validated once at server start (src/instrumentation.ts).
//
// Configuration (.env):
//   OBJECT_STORE_ENDPOINT            S3 API URL the server uses for uploads, reads and deletes, e.g. http://garage:3900
//   OBJECT_STORE_PUBLIC_ENDPOINT     S3 API URL as browsers and apps reach it. Only used to sign photo URLs: a signature
//                                    is bound to the host, so a URL signed for the internal endpoint fails from outside.
//   OBJECT_STORE_REGION              Must match s3_region in garage.toml
//   OBJECT_STORE_BUCKET
//   OBJECT_STORE_ACCESS_KEY_ID
//   OBJECT_STORE_SECRET_ACCESS_KEY
//   PHOTO_URL_TTL_SECONDS            How long a photo URL handed to a client stays valid. Optional, defaults to an hour.

import { z } from 'zod'
import { ErrorCode, fail, ok, Result } from '@/schemas/result'

type Env = Record<string, string | undefined>

export type ObjectStoreConfig = {
    endpoint: string
    publicEndpoint: string
    region: string
    bucket: string
    accessKeyId: string
    secretAccessKey: string
}

export const DEFAULT_PHOTO_URL_TTL_SECONDS = 3600

// Empty values count as missing, so a blank line copied from .env.example is reported rather than used
const required = z.preprocess((value) => value || undefined, z.string({ error: 'is required' }))

const endpoint = z.preprocess(
    (value) => (typeof value === 'string' ? value.replace(/\/+$/, '') : value) || undefined,
    z.url({ protocol: /^https?$/, error: (issue) => issue.input === undefined ? 'is required' : 'must be an http(s) URL' }),
)

const ObjectStoreEnv = z.object({
    OBJECT_STORE_ENDPOINT: endpoint,
    OBJECT_STORE_PUBLIC_ENDPOINT: endpoint,
    OBJECT_STORE_REGION: required,
    OBJECT_STORE_BUCKET: required,
    OBJECT_STORE_ACCESS_KEY_ID: required,
    OBJECT_STORE_SECRET_ACCESS_KEY: required,
})

const PhotoUrlTtlEnv = z.object({
    PHOTO_URL_TTL_SECONDS: z.preprocess(
        (value) => value || undefined,
        z.coerce.number({ error: 'must be a whole number of seconds' })
            .int({ error: 'must be a whole number of seconds' })
            .min(60, { error: 'must be at least 60 seconds' })
            .max(86_400, { error: 'must be at most 86400 seconds (a day)' })
            .default(DEFAULT_PHOTO_URL_TTL_SECONDS),
    ),
})

export function parseObjectStoreConfig(env: Env = process.env): Result<ObjectStoreConfig> {
    const parsed = ObjectStoreEnv.safeParse(env)
    if (!parsed.success) {
        return invalid('Object storage is not configured', parsed.error)
    }

    return ok({
        endpoint: parsed.data.OBJECT_STORE_ENDPOINT,
        publicEndpoint: parsed.data.OBJECT_STORE_PUBLIC_ENDPOINT,
        region: parsed.data.OBJECT_STORE_REGION,
        bucket: parsed.data.OBJECT_STORE_BUCKET,
        accessKeyId: parsed.data.OBJECT_STORE_ACCESS_KEY_ID,
        secretAccessKey: parsed.data.OBJECT_STORE_SECRET_ACCESS_KEY,
    })
}

export function parsePhotoUrlTtlSeconds(env: Env = process.env): Result<number> {
    const parsed = PhotoUrlTtlEnv.safeParse(env)
    if (!parsed.success) {
        return invalid('Photo URL lifetime is misconfigured', parsed.error)
    }
    return ok(parsed.data.PHOTO_URL_TTL_SECONDS)
}

/** One message naming every bad variable, e.g. "...: OBJECT_STORE_BUCKET is required; OBJECT_STORE_ENDPOINT must be..." */
function invalid(summary: string, error: z.ZodError) {
    const fieldErrors = z.flattenError(error).fieldErrors as Record<string, string[]>
    const details = Object.entries(fieldErrors).map(([name, messages]) => `${name} ${messages.join(', ')}`)
    return fail(ErrorCode.VALIDATION_FAILED, `${summary}: ${details.join('; ')}`, fieldErrors)
}
