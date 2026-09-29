import { describe, expect, it } from 'vitest'
import {
    DEFAULT_PHOTO_URL_TTL_SECONDS,
    parseObjectStoreConfig,
    parsePhotoUrlTtlSeconds,
} from '@/infrastructure/storage/config'
import { ErrorCode } from '@/schemas/result'
import { expectFailure, expectSuccess } from '@/test/helpers/result'

const validEnv = {
    OBJECT_STORE_ENDPOINT: 'http://garage:3900',
    OBJECT_STORE_PUBLIC_ENDPOINT: 'https://files.example.test',
    OBJECT_STORE_REGION: 'garage',
    OBJECT_STORE_BUCKET: 'location-photos',
    OBJECT_STORE_ACCESS_KEY_ID: 'GKtestaccesskey',
    OBJECT_STORE_SECRET_ACCESS_KEY: 'test-secret-key-long-enough',
}

describe('parseObjectStoreConfig', () => {
    it('should read a complete configuration', () => {
        // Act
        const config = expectSuccess(parseObjectStoreConfig(validEnv))

        // Assert
        expect(config).toEqual({
            endpoint: 'http://garage:3900',
            publicEndpoint: 'https://files.example.test',
            region: 'garage',
            bucket: 'location-photos',
            accessKeyId: 'GKtestaccesskey',
            secretAccessKey: 'test-secret-key-long-enough',
        })
    })

    it('should drop trailing slashes from the endpoints', () => {
        // Act
        const config = expectSuccess(parseObjectStoreConfig({
            ...validEnv,
            OBJECT_STORE_ENDPOINT: 'http://garage:3900/',
            OBJECT_STORE_PUBLIC_ENDPOINT: 'https://files.example.test//',
        }))

        // Assert
        expect(config.endpoint).toBe('http://garage:3900')
        expect(config.publicEndpoint).toBe('https://files.example.test')
    })

    it('should report every missing variable at once', () => {
        // Act
        const result = expectFailure(parseObjectStoreConfig({}))

        // Assert
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(Object.keys(validEnv).sort())
        for (const name of Object.keys(validEnv)) {
            expect(result.error).toContain(name)
        }
    })

    it('should treat empty values as missing', () => {
        // Act
        const result = expectFailure(parseObjectStoreConfig({ ...validEnv, OBJECT_STORE_BUCKET: '' }))

        // Assert
        expect(Object.keys(result.fieldErrors ?? {})).toEqual(['OBJECT_STORE_BUCKET'])
    })

    it('should require the public endpoint even when the internal one is set', () => {
        // Arrange - falling back to the internal endpoint would sign URLs browsers can't reach
        const withoutPublic = { ...validEnv, OBJECT_STORE_PUBLIC_ENDPOINT: undefined }

        // Act
        const result = expectFailure(parseObjectStoreConfig(withoutPublic))

        // Assert
        expect(Object.keys(result.fieldErrors ?? {})).toEqual(['OBJECT_STORE_PUBLIC_ENDPOINT'])
    })

    it.each(['localhost:3900', 'ftp://garage:3900', 'not a url'])('should reject the endpoint %s', (endpoint) => {
        // Act
        const result = expectFailure(parseObjectStoreConfig({ ...validEnv, OBJECT_STORE_ENDPOINT: endpoint }))

        // Assert
        expect(Object.keys(result.fieldErrors ?? {})).toEqual(['OBJECT_STORE_ENDPOINT'])
    })
})

describe('parsePhotoUrlTtlSeconds', () => {
    it.each([undefined, ''])('should default to an hour when the value is %j', (value) => {
        // Act & Assert
        expect(expectSuccess(parsePhotoUrlTtlSeconds({ PHOTO_URL_TTL_SECONDS: value }))).toBe(DEFAULT_PHOTO_URL_TTL_SECONDS)
        expect(DEFAULT_PHOTO_URL_TTL_SECONDS).toBe(3600)
    })

    it('should read a configured TTL', () => {
        // Act & Assert
        expect(expectSuccess(parsePhotoUrlTtlSeconds({ PHOTO_URL_TTL_SECONDS: '900' }))).toBe(900)
    })

    it.each(['59', '86401', '1.5', 'abc', '-3600'])('should reject %s', (value) => {
        // Act
        const result = expectFailure(parsePhotoUrlTtlSeconds({ PHOTO_URL_TTL_SECONDS: value }))

        // Assert
        expect(result.code).toBe(ErrorCode.VALIDATION_FAILED)
        expect(result.error).toContain('PHOTO_URL_TTL_SECONDS')
    })
})
