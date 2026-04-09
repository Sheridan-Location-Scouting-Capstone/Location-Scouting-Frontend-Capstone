import {beforeEach, expect, describe, it, test} from "vitest";
import {createLocation} from "@/app/services/locationService";
import { prisma } from '@/test/setup'
import {createProject} from "@/app/services/productionService";
import {IntExt} from "@prisma/client";
import {KeywordGenerator} from "@/app/services/keywordGenerator";
import {createScene} from "@/app/services/sceneService";
import {
    createCandidate,
    getCandidatesForScene,
    removeCandidateFromScene,
    toggleCandidateSelected
} from "@/app/services/candidateService";
import {addPhotosToLocation} from "@/app/services/locationPhotoService";
import {Geocoder} from "@/app/schemas/geocoder";
import {PhotoUploadInput} from "@/app/schemas/photoUploadInput";

const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['house', 'generated', 'gothic'] })
const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })

describe('Candidate Services', () => {
    let locationId: string
    let projectId: string
    let sceneId: string


    beforeEach(async() => {
        // Location Arrange
        const locationInput = {
            name: 'Downtown Alley',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 1A1'
        }

        const locationResult = await createLocation(locationInput, { db: prisma, geocoder: mockGeocoder })

        expect(locationResult.id).toBeDefined()
        expect(locationResult.id).not.toBeNull()
        locationId = locationResult.id

        // Project Arrange
        const productionInput = {
            name: 'Another Test Production',
            address: '789 Movie Ave',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M5V 2B2',
            country: 'Canada'
        }
        const projectResult = await createProject(productionInput, {db: prisma})

        expect(projectResult.success).toBe(true)
        if(!projectResult.success) return
        projectId = projectResult.data!.id


        // Scene Arrange
        const sceneInput = {
            sceneNumber: 2,
            intExt: IntExt.EXT,
            sceneLocation: 'CURTIS HOME - YARD - FRENCHTOWN FL',
            sceneTimeOfDay: 'Day',
            scriptSection: ' ELWOOD (6-8ish) POV of the midday sky where the moon is\n' +
                '     visible against its blue hue. The underside of a lemon tree\n' +
                '     with lemons is also in view.\n' +
                '\n' +
                '                         EVELYN (O.S.)\n' +
                '                   (calling out)\n' +
                '               Elwood? Elwood! (louder) El!\n' +
                '\n' +
                '     He tilts his head toward the house, his arm outstretched in\n' +
                '     the same direction in the unruly tropical backyard of the\n' +
                '     family house.\n' +
                '\n' +
                '                         HATTIE (O.S.)\n' +
                '               He\'s out back, looking like he fell\n' +
                '               out.\n',
            projectId: projectId
        }

        const sceneResult = await createScene(sceneInput, { db: prisma, keywordGenerator: dummyKeyWordGen})
        expect(sceneResult.success).toBe(true)
        expect(sceneResult.data.id).not.toBeNull()
        expect(sceneResult.data.projectId).toBe(projectId)
        if(sceneResult.success) {
            sceneId = sceneResult.data.id
        }
    })

    describe('Create Candidate', () => {
        it(' should save a candidate with minimum required fields and return it with an id', async() => {
            // Arrange
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }

            // Act
            const result = await createCandidate(candidateInput, {db: prisma})

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data.id).toBeDefined()
                expect(result.data.id).not.toBeNull()
                expect(result.data.sceneId).toBe(sceneId)
                expect(result.data.locationId).toBe(locationId)
                expect(result.data.selected).toBe(false)
            }
        })

        it(' should associate selected photos with the candidate', async () => {
            // Arrange - add photos to the test data location
            const photoInput = [{
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test.jpg',
                    mimeType: 'image/jpeg'
                },
                {
                    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
                    filename: 'test2.jpg',
                    mimeType: 'image/jpeg'
                }]

            const photoResult = await addPhotosToLocation(locationId, photoInput, { db: prisma })
            expect(photoResult.success).toBe(true)
            let photoIds: string[] = []
            if(photoResult.success) {
                photoIds = photoResult.data.map(p => p.id)
            }


            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId,
                photos: photoIds
            }

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success) {
                const candidatePhotos = await prisma.candidatePhoto.findMany({
                    where : { candidateId: result.data.id }
                })
                expect(candidatePhotos).toBeDefined()
                expect(candidatePhotos).toHaveLength(2)
            }
        })

        test.each([
            { selected: true },
            { selected: false },
            { selected: undefined }
        ])('should save a candidate with selected=$selected', async({selected}) => {
            // Arrange
            const candidateInput = {
                sceneId,
                locationId,
                ... (selected !== undefined && { selected })
            }

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(result.success){
                expect(result.data.id).toBeDefined()
                expect(result.data.id).not.toBeNull()
                expect(result.data.sceneId).toBe(sceneId)
                expect(result.data.locationId).toBe(locationId)
                expect(result.data.selected).toBe(selected ?? false)
            }
        })

        it.each([
            {
                sceneId: "doesntexist",
                locationId: undefined
            },
            {
                sceneId: undefined,
                locationId: "doesntexist"
            }
        ])(' should fail to save if either the location or scene do not exist', async(input) => {
            // Arrange
            const candidateInput = {
                sceneId: input.sceneId ?? sceneId,
                locationId: input.locationId ?? locationId
            }

            // Act
            const result = await createCandidate( candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })

        it(' should reject a candidate that already has a location associated with a scene', async() => {
            // Arrange
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }

            const setupResult = await createCandidate(candidateInput, { db: prisma })
            expect(setupResult.success).toBe(true)

            // Act
            const result = await createCandidate(candidateInput, { db: prisma })

            // Assert
            expect(result.success).toBe(false)
        })
    })

    describe('Get all candidates by Scene', () => {

        let candidateIds: string[]


        beforeEach( async() => {
            // Arrange first candidate
            const firstCandidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }


            // Arrange second location. This separates out the candidate set across multiple locations
            const secondLocationInput = {
                name: 'Downtown Alley',
                address: '124 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A1'
            }

            // Act & Assert - create second location
            const secondLocationInputResult = await createLocation(secondLocationInput, { db: prisma, geocoder: mockGeocoder })
            expect(secondLocationInputResult).toBeDefined()
            expect(secondLocationInputResult.id).not.toBeNull()
            const secondLocationId: string = secondLocationInputResult.id


            // Arrange - second candidate
            const secondCandidateInput = {
                sceneId: sceneId,
                locationId: secondLocationId
            }

            // Act - create first and second candidates
            const firstCandidateResult = await createCandidate(firstCandidateInput, { db: prisma })
            const secondCandidateResult = await createCandidate(secondCandidateInput, { db: prisma })

            expect(firstCandidateResult.success).toBe(true)
            expect(secondCandidateResult.success).toBe(true)


            // Assert both candidates were created & assign ids to accessible values in tests
            let firstCandidateId : string
            let secondCandidateId : string

            if(firstCandidateResult.success) {
                expect(firstCandidateResult.data).toBeDefined()
                expect(firstCandidateResult.data.id).not.toBeNull()
                firstCandidateId = firstCandidateResult.data.id
            }

            if(secondCandidateResult.success) {
                expect(secondCandidateResult.data).toBeDefined()
                expect(secondCandidateResult.data.id).not.toBeNull()
                secondCandidateId = secondCandidateResult.data.id
            }

            candidateIds = [firstCandidateId!, secondCandidateId!]
        })


        it(' should get all candidates by scene id', async () => {
            // Arrange & Act
            const result = await getCandidatesForScene(sceneId, { db: prisma })

            // Assert
            expect(result).toBeDefined()
            expect(result.success).toBe(true)
            if(result.success){
                expect(result.data).toHaveLength(candidateIds.length)
                const resultIds: string[] = result.data.map(c => c.id)
                expect(resultIds).toEqual(expect.arrayContaining(candidateIds))
            }
        })

        it(' should include the locations', async() => {
            // Act
            const result = await getCandidatesForScene(sceneId, { db: prisma })

            // Assert
            expect(result).toBeDefined()
            expect(result.success).toBe(true)
            if(result.success) {
                expect(result.data.length).toBeGreaterThanOrEqual(candidateIds.length)
                // @ts-ignore
                expect(result.data[0].location).toBeDefined()
                // @ts-ignore
                expect(result.data[0].location.id).toBeDefined()
            }
        })

        it(' should only include the selected location photos', async() => {
            // Arrange - associate some photos with one of the locations
            const photoInput: PhotoUploadInput[] = [{
                    locationId: locationId,
                    buffer: Buffer.from('this is some really fake image data for a candidate'),
                    filename: 'candidatephoto.jpg',
                    mimeType: 'image/jpg'
                },
                {
                    locationId: locationId,
                    buffer: Buffer.from('another candidate photo'),
                    filename: 'candidatephoto2.jpg',
                    mimeType: 'image/jpg'
                }]

            // Arrange-Act
            const photoUploadResult = await addPhotosToLocation(locationId, photoInput, {db: prisma })

            // Arrange-Assert
            expect(photoUploadResult.success).toBe(true)

        })
    })

    describe('Delete Candidate: removeCandidateFromScene', () => {
        it(' should remove a candidate from a scene', async () => {
            //Arrange -> Arrange
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId
            }

            // Arrange -> Act
            const candidateCreateResult = await createCandidate(candidateInput, { db: prisma })

            // Arrange -> Assert
            expect(candidateCreateResult.success).toBe(true)
            if(!candidateCreateResult.success) return

            // Act
            const result = await removeCandidateFromScene(candidateCreateResult.data.id, {db: prisma })

            // Assert
            expect(result.success).toBe(true)
            const candidatesResult = await getCandidatesForScene(sceneId, { db: prisma })
            expect(candidatesResult.success).toBe(true)
            if(!candidatesResult.success) return
            expect(candidatesResult.data.find(c => c.id === candidateCreateResult.data.id)).toBeUndefined()
        })
    })

    describe('Change Candidate Status (toggleCandidateSelected)', () => {
        let candidateId: string

        beforeEach(async() => {
            const candidateInput = {
                sceneId: sceneId,
                locationId: locationId,
            }

            const candidateResult = await createCandidate(candidateInput, { db: prisma })
            expect(candidateResult.success).toBe(true)
            if(!candidateResult.success) return

            expect(candidateResult.data.id).toBeDefined()
            candidateId = candidateResult.data.id
        })

        test.each([
            { selected: true },
            { selected: false }
        ])(' should set the candidate status to input: $selected', async ({selected}) => {
            // Arrange & Act
            const result = await toggleCandidateSelected(candidateId, selected, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(!result.success) return
            expect(result.data).toBeDefined()
            expect(result.data!.selected).toBe(selected)
        })

        it(' should allow more than one candidate per scene to be selected', async() => {
            // Arrange - set up a second location & candidate
            const locationInput = {
                name: 'Downtown Alley',
                address: '100 Main St',
                city: 'Toronto',
                province: 'ON',
                postalCode: 'M5V 1A2'
            }

            const locationResult = await createLocation(locationInput, { db: prisma, geocoder: mockGeocoder })
            const secondLocationId = locationResult.id

            // Arrange set up the candidate
            const candidateInput = {
                locationId: secondLocationId,
                sceneId: sceneId,
            }

            const arrangeResult = await createCandidate(candidateInput, { db: prisma })
            expect(arrangeResult.success).toBe(true)
            if(!arrangeResult.success) return
            const secondCandidateId = arrangeResult.data.id

            // Arrange - set other candidate as selected
            const selectedResult = await toggleCandidateSelected(candidateId, true, { db: prisma })

            // Act - set newly generated candidate as selected
            const result = await toggleCandidateSelected(secondCandidateId, true, { db: prisma })

            // Assert
            expect(result.success).toBe(true)
            if(!result.success) return
            expect(result.data!.selected).toBe(true)
        })
    })

    // describe('Candidate Historical Score, calculateHistoricalCandidateScore', async () => {
    //     let secondSceneId:string
    //     let thirdSceneId:string
    //
    //     beforeEach(async() => {
    //         // Arrange
    //         // Set up several scenes
    //         // Scene Arrange
    //         const sceneInput = [{
    //                 sceneNumber: 3,
    //                 intExt: IntExt.EXT,
    //                 sceneLocation: 'CURTIS HOME - YARD - MIAMI FL',
    //                 sceneTimeOfDay: 'Day',
    //                 scriptSection: ' ELWOOD (6-8ish) POV of the middle of the day sky where the moon is\n' +
    //                     '     visible against its blue hue. The underside of a lemon tree\n' +
    //                     '     with lemons is also in view.\n' +
    //                     '\n' +
    //                     '                         EVELYN (O.S.)\n' +
    //                     '                   (calling out)\n' +
    //                     '               Elwood? Elwood! (louder) El!\n' +
    //                     '\n' +
    //                     '     He tilts his head toward the tall house, his arm outstretched in\n' +
    //                     '     the same direction in the unruly tropical backyard of the\n' +
    //                     '     family house.\n' +
    //                     '\n' +
    //                     '                         HATTIE (O.S.)\n' +
    //                     '               He\'s out back, looking like he fell\n' +
    //                     '               out.\n',
    //                 projectId: projectId
    //             },
    //             {
    //                 sceneNumber: 3,
    //                 intExt: IntExt.EXT,
    //                 sceneLocation: 'CURTIS HOME - FRONTYARD - MIAMI FL',
    //                 sceneTimeOfDay: 'Day',
    //                 scriptSection: ' ELWOOD (6-8ish) POV of the middle of the day sky where the moon is\n' +
    //                     '     visible against its blue hue. The underside of a lemon tree\n' +
    //                     '     with lemons is also in view.\n' +
    //                     '\n' +
    //                     '                         EVELYN (O.S.)\n' +
    //                     '                   (calling out)\n' +
    //                     '               Elwood? Elwood! (louder) El!\n' +
    //                     '\n' +
    //                     '     He slightly tilts his head toward the tall house, his arm outstretched in\n' +
    //                     '     the same direction in the unruly tropical backyard of the\n' +
    //                     '     family house.\n' +
    //                     '\n' +
    //                     '                         HATTIE (O.S.)\n' +
    //                     '               He\'s out back, looking like he fell\n' +
    //                     '               out.\n',
    //                 projectId: projectId
    //             }
    //         ]
    //
    //         const sceneCreationResult1 = await createScene(sceneInput[0], { db: prisma, keywordGenerator: dummyKeyWordGen })
    //         const sceneCreationResult2 = await createScene(sceneInput[1], { db: prisma, keywordGenerator: dummyKeyWordGen })
    //
    //         expect(sceneCreationResult1.success).toBe(true)
    //         expect(sceneCreationResult2.success).toBe(true)
    //         if(!sceneCreationResult2.success) return
    //         if(!sceneCreationResult1.success) return
    //
    //         secondSceneId = sceneCreationResult1.data!.id
    //         thirdSceneId = sceneCreationResult2.data!.id
    //     })
    //
    //
    //     // This test needs to be refactored to score 1 when it's the max threshold
    //     it('should return the score of a candidate based on how many times the location has been selected, between 0 and 1', async () => {
    //         // Arrange - isolated location
    //         const historicalLocationInput = {
    //             name: 'Downtown Alley',
    //             address: '123 Main St',
    //             city: 'Toronto',
    //             province: 'ON',
    //             postalCode: 'M5V 1A1'
    //         }
    //
    //         const historicalLocation = await createLocation(historicalLocationInput, { db: prisma, geocoder: mockGeocoder })
    //         expect(historicalLocation).toBeDefined()
    //         const historicalLocationId = historicalLocation.id
    //
    //         const firstCandidateInput = {
    //             sceneId: secondSceneId,
    //             locationId: historicalLocationId,
    //             selected: true
    //         }
    //
    //         const secondCandidateInput = {
    //             sceneId: thirdSceneId,
    //             locationId: historicalLocationId,
    //             selected: true
    //         }
    //
    //         const thirdCandidateInput = {
    //             sceneId: sceneId,
    //             locationId: historicalLocationId,
    //             selected: true
    //         }
    //
    //         const firstCandidateResult = await createCandidate(firstCandidateInput, { db: prisma })
    //         const secondCandidateResult = await createCandidate(secondCandidateInput, { db: prisma })
    //         const thirdCandidateResult = await createCandidate(thirdCandidateInput, { db: prisma })
    //         if(!thirdCandidateResult.success) return
    //         if(!secondCandidateResult.success) return
    //         if(!firstCandidateResult.success) return
    //
    //         // Location now has been selected across multiple candidates.
    //         // Use the third one as the sut
    //         const systemUnderTest = firstCandidateResult.data!.id
    //
    //         // Act
    //         const result = await (systemUnderTest, { db: prisma })
    //
    //         // Assert
    //         expect(result.success).toBe(true)
    //         if(!result.success) return
    //         expect(result.data).toBe(0.7737056144690831)
    //     });
    // })
})