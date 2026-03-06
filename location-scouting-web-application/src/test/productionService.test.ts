import {prisma} from '@/test/setup'
import {describe, expect, it, test, vi} from 'vitest'
import { createProject } from "@/app/services/productionService";

describe('Production Service', () => {
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
        const sut = await createProject(productionInput, {db: prisma })

        // Assert
        expect(sut.success).toBe(true)
        if(sut.success) {
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
        await expect(createProject(productionInput as any, {db: prisma })).rejects.toThrow()
    })
})