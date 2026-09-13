import {v4 as uuidv4} from "uuid";
import {auth} from "@/lib/auth";
import {given} from "@/test/preconditions";
import {Page} from "@playwright/test";


export const createDefaultTestUser = () => ({
    name: "John Doe",
    email: "test+" + uuidv4().substring(0, 8) + "@example.com",
    password: "Test@1234",
});

export const signUpSetup : (user?: any) => Promise<{ name: string; email: string; password: string }> = (async(user) => {
    const testUser = user ?? createDefaultTestUser();

    await given('a user exists', async() => {
        const { user } = await auth.api.signUpEmail({body: testUser})
        if(!user.id) throw new Error("User not created");
    })
    return testUser
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