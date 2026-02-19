import {describe, it, expect, test} from 'vitest'
import {createLocation} from "@/app/services/locationService";
import { prisma } from '@/test/setup'

describe('locationServiceTests', () =>{
    it('should save a location with minimum required fields and return it with an id', async () => {
        // Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1'
        }

        // Act
        const result = await createLocation(locationInput, prisma);

        // Assert
        expect(result.id).toBeDefined()
        expect(result.name).toBe('Downtown Alley')
        expect(result.country).toBe('Canada') // Verify default value applied
        expect(result.status).toBe('ACTIVE')  // Verify default value applied
        expect(result.createdAt).toBeDefined()
        expect(result.updatedAt).toBeDefined()
    })

    test.each([
        ['empty postal code', {name: 'Downtown Alley', address: '123 Main St', city: 'Toronto', province: 'ON', postalCode: ''}],
        ['empty province', {name: 'Downtown Alley', address: '123 Main St', city: 'Toronto', province: '', postalCode: 'M5V 1A1'}],
        ['empty city', {name: 'Downtown Alley', address: '123 Main St', city: '', province: '', postalCode: 'M5V 1A1'}],
        ['empty name', {name: '', address: '123 Main St', city: 'Toronto', province: '', postalCode: 'M5V 1A1'}],
        ['empty address', {name: 'Downtown Alley', address: '', city: 'Toronto', province: '', postalCode: 'M5V 1A1'}],
    ])('should throw an error when there is an %s', async function (description, input) {
        await expect(() => createLocation(input, prisma)).rejects.toThrow()
    })

    it('should assign a unique ID to the location', async () => {})
    it('should geocode an address on creation', async () => {})
    it('')
    test.each([
        '(705) 773 3685',
        '705 773 3685',
        '(705)7733685',
        '(905)1124235',
        '(705)-773-3685',
        '705-773-3685'
    ])('should accept various phone numbers formats', async (input) => {
        // Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1',
            contactPhone: input
        }

        // Act
        const result = await createLocation(locationInput, prisma);

        // Assert
        expect(result.contactPhone).toBeDefined()
    })

    test.each([
        '1',
        'ASDF',
        'INVALID INPUT',
        'M1XeD InpUt',
        '12312315353555542341523',
        '()()()()()()()()()()()(242'
    ])('should reject invalid phone numbers', async (input) => {
        // Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1',
            contactPhone: input
        }

        // Act & Assert (Expected Error)
        await expect(createLocation(locationInput, prisma)).rejects.toThrow();
    })

    test.each([
        'J', // 1 char
        'A1', // 2 char
        'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. TheG', // 69 char
        'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The G' // 70 char
    ])('should accept contact names with between 1 and 70 characters long (boundary-value analysis)', async (input) => {
        // Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1',
            contactName: input
        }

        // Act
        const result = await createLocation(locationInput, prisma);

        // Assert
        expect(result.contactName).toBeDefined()
        expect(result.contactName).toEqual(input)
    })

    test.each([
        '', // 0 char
        'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gr', // 71 char
        'Alexander Maximillian Christopher-Jonathan Montgomery-Smythe Jr. The Gre' // 72 char
    ])('should reject invalid contact names (boundary value analysis)', async (input) => {
        // Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1',
            contactName: input
        }

        // Act
        const result = createLocation(locationInput, prisma);

        // Assert
        await expect(result).rejects.toThrow();
    })






})