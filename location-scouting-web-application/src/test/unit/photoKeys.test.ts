import { describe, expect, it } from 'vitest'
import { isInUserStorage, newPhotoKey, photoKey, userStoragePrefix } from '@/lib/photoKeys'

describe('photo storage keys', () => {
    describe('userStoragePrefix', () => {
        it('should put everything a user owns under users/<userId>/', () => {
            expect(userStoragePrefix('Abc123_-x')).toBe('users/Abc123_-x/')
        })

        it.each(['', '../other', 'a/b', 'user id', 'user%2F..', '.'])('should refuse the user id %j', (userId) => {
            // A user id becomes part of a storage path, so nothing in it may reach outside its own prefix
            expect(() => userStoragePrefix(userId)).toThrow()
        })
    })

    describe('newPhotoKey', () => {
        it('should place a new photo under its owner\'s prefix with a fresh name and the file\'s extension', () => {
            expect(newPhotoKey('user1', 'Back Alley.JPG')).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}\.jpg$/)
        })

        it('should give every upload a different key, even for the same file name', () => {
            expect(newPhotoKey('user1', 'same.jpg')).not.toBe(newPhotoKey('user1', 'same.jpg'))
        })

        it.each([
            ['../../etc/passwd?x=1#.png', /\.png$/],
            ['photo.<script>', /photos\/[0-9a-f-]{36}$/],
            ['README', /photos\/[0-9a-f-]{36}$/],
        ])('should keep nothing of %j but a plain extension', (filename, expected) => {
            const key = newPhotoKey('user1', filename)
            expect(key).toMatch(/^users\/user1\/photos\/[0-9a-f-]{36}/)
            expect(key).toMatch(expected)
        })
    })

    describe('photoKey', () => {
        it('should name a photo after the given id, keeping the extension of the given file name or key', () => {
            expect(photoKey('user1', 'photo-id', 'photos/0b2f.jpeg')).toBe('users/user1/photos/photo-id.jpeg')
            expect(photoKey('user1', 'photo-id', '1700000000000-IMG_1234.HEIC')).toBe('users/user1/photos/photo-id.heic')
        })
    })

    describe('isInUserStorage', () => {
        it('should tell whether a key sits under the user\'s own prefix', () => {
            expect(isInUserStorage('users/user1/photos/a.jpg', 'user1')).toBe(true)
            expect(isInUserStorage('users/user10/photos/a.jpg', 'user1')).toBe(false)
            expect(isInUserStorage('photos/a.jpg', 'user1')).toBe(false)
            expect(isInUserStorage('1700000000000-a.jpg', 'user1')).toBe(false)
        })
    })
})
