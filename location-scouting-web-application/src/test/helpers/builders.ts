import {IntExt} from "@prisma/client";

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

export function buildProjectInput({
    name = 'Test Production',
    address = '456 Film St',
    city = 'Vancouver',
    province = 'BC',
    postalCode = 'V5K 0A1',
    country = 'Canada',
} = {}) {
    return { name, address, city, province, postalCode, country }
}

export function buildSceneInput(projectId: string, {
    sceneNumber = 1,
    intExt = IntExt.EXT as IntExt,
    sceneLocation = 'CURTIS HOME - YARD',
    sceneTimeOfDay = 'Day',
    scriptSection = 'The unruly tropical backyard of the family house.',
} = {}) {
    return { sceneNumber, intExt, sceneLocation, sceneTimeOfDay, scriptSection, projectId }
}
