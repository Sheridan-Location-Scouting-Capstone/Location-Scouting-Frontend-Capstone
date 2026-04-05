import {prisma} from '@/test/setup'
import {describe, expect, it, test, vi} from 'vitest'
import {createProject, getProjectById, getProjects} from "@/app/services/productionService";

describe('Production Service', () => {
    describe('createProject', () => {
        it('should save a production with minimum required fields', async () => {
            // Arrange
            const productionInput = {
                name: 'Test Production',
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }

            // Act
            const sut = await createProject(productionInput, {db: prisma})

            // Assert
            expect(sut.success).toBe(true)
            if (sut.success) {
                expect(sut.data).not.toBeNull()
                expect(sut.data.name).toBe(productionInput.name)
                expect(sut.data.id).toBeDefined()
            }
        })

        it('should fail to save a production with missing required fields', async () => {
            // Arrange
            const productionInput = {
                address: '456 Film St',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V5K 0A1',
                country: 'Canada'
            }

            // Act & Assert
            await expect(createProject(productionInput as any, {db: prisma})).rejects.toThrow()
        })
    })

    describe('Get Productions', () => {
        it('should retrieve a list of productions', async () => {
            // Arrange - Create a production to ensure there is at least one
            const productionInput = {
                name: 'Another Test Production',
                address: '789 Movie Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2',
                country: 'Canada'
            }
            await createProject(productionInput, {db: prisma})

            // Act
            const productions = await getProjects({db: prisma})

            // Assert
            if (productions.success) {
                expect(productions.data).toBeInstanceOf(Array)
                expect(productions.data.length).toBeGreaterThan(0)
                const found = productions.data.find(p => p.name === productionInput.name)
                expect(found).toBeDefined()
                if (found) {
                    expect(found.address).toBe(productionInput.address)
                    expect(found.city).toBe(productionInput.city)
                }
            }
        })
    })

    describe('Get Production By ID', () => {
        it(' should retrieve a production by its ID', async () => {
            // Arrange
            const productionInput = {
                name: 'Another Test Production',
                address: '789 Movie Ave',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 2B2',
                country: 'Canada'
            }

            const createdProjectResult = await createProject(productionInput, { db: prisma })

            expect(createdProjectResult.success).toBe(true)

            // Act
            if(createdProjectResult.success) {
                expect(createdProjectResult.data.id).toBeDefined()
                expect(createdProjectResult.data.id).not.toBeNull()
                const result = await getProjectById(createdProjectResult.data.id, { db: prisma })


                // Assert
                expect(result).toBeDefined()
                expect(result.success).toBe(true)
                if(result.success) {
                    expect(result.data.id).toEqual(createdProjectResult.data.id)
                }
            }
        })

        it(' should fail to find a production by its ID when it does not exist', async () => {
            // Arrange
            const nonExistentID = "kdhngowie90238hfglskjd90ThisShouldNotExist";

            // Act
            const result = await getProjectById(nonExistentID, { db: prisma })

            // Assert
            expect(result.success).toBe(false);
        })
    })
})