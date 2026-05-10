import { z } from 'zod';
import {IntExt} from "@prisma/client";

export const CreateSceneSchema = z.object({
    sceneNumber: z.number(),
    intExt: z.enum(IntExt),
    sceneLocation: z.string().min(1, "Scene location is required"),
    sceneTimeOfDay: z.string().min(1, "Scene time of day is required"),
    scriptSection: z.string().min(1, "Script content is required"),
    projectId: z.string()
})

export const UpdateSceneSchema = z.object({
    sceneNumber: z.number(),
    intExt: z.enum(IntExt),
    sceneLocation: z.string().min(1, "Scene location is required"),
    sceneTimeOfDay: z.string().min(1, "Scene time of day is required"),
    scriptSection: z.string().min(1, "Script content is required"),
    projectId: z.string(),
    keywords: z.array(z.string()).optional().default([]),
})


interface SceneSchema {
    id: number;
    sceneHeading: string;
    scriptSection: string; // body (text) of the script inside this scene
    locationKeywords: string[];
    projectId: number;
    // locations: number[]; // list of locations in a scene
}