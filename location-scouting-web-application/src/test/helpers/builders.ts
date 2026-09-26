import {signUpSetup} from "@/test/e2e/fixtures";

export function buildLocationInput({
    name = 'Downtown Alley',
    address = '123 Main St',
    city = 'Toronto',
    province = 'ON',
    postalCode = 'M5V 1A1',
    contactName = undefined as string | undefined,
    contactPhone = undefined as string | undefined,
} = {}) {
    return {name, address, city, province, postalCode, contactName, contactPhone }
}