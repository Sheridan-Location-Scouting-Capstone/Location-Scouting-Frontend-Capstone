import {v4 as uuidv4} from "uuid";
import {auth} from "@/lib/auth";
import {given} from "@/test/preconditions";
import {Page} from "@playwright/test";
import {createLocation} from "@/services/locationService";
import {buildLocationInput} from "@/test/helpers/builders";
import { prisma } from '@/test/setup'
import {KeywordGenerator} from "@/services/keywordGenerator";
import {Geocoder} from "@/schemas/geocoder";
import {PrismaClient} from "@prisma/client";

const dummyKeyWordGen: KeywordGenerator = async() => ({ success: true, data: ['house', 'generated', 'gothic'] })
const mockGeocoder: Geocoder = async () => ({ lat: 43.6532, lng: -79.3832 })


export const createDefaultTestUser = () => ({
    name: "John Doe",
    email: "test+" + uuidv4().substring(0, 8) + "@example.com",
    password: "Test@1234",
});

export const signUpSetup : (user?: any) => Promise<{ userId: string, name: string; email: string; password: string }> = (async(user) => {
    const testUser = user ?? createDefaultTestUser();

    let userResult
    await given('a user exists', async() => {
        userResult = await auth.api.signUpEmail({body: testUser})
        if(!userResult.user.id) throw new Error("User not created");
    })
    return {...testUser, userId: userResult!.user.id}
})

export const signInSetup = async ( { email, password }: { email: string, password: string}, page: Page
) => {
    const res = await page.request.post('/api/auth/sign-in/email', {
        data: { email, password }
    })
    if(!res.ok()) {
        throw new Error(`Sign-in failed: ${res.status()} ${await res.text()}`)
    }
}

export const setupUserWithLocations = async (numOfLocations: number, options?: { db?: PrismaClient, geoCoder?: Geocoder }) => {
    const db = options?.db ?? prisma;
    const geocoder = options?.geoCoder ?? mockGeocoder;

    const testUser = createDefaultTestUser();
    const user = await signUpSetup(testUser);
    const locations = [];
    for (let i = 0; i < numOfLocations; i++) {
        const result = await createLocation(user.userId, buildLocationInput(), { db: db, geocoder: geocoder });
        if(result.success) {
            locations.push(result.data);
        } else {
            throw new Error(`Failed to create location: ${result.error}`);
        }
    }
    return { user, locations };
};