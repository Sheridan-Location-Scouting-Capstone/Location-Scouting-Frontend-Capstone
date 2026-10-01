import { Prisma } from '@prisma/client';

export const candidateWithLocation = {
    include: {
        location: true,
        candidatePhotoGroups: {
            include: {
                candidatePhotos: true
            }
        },
    },
} satisfies Prisma.CandidateDefaultArgs;

export type CandidateWithLocation = Prisma.CandidateGetPayload<typeof candidateWithLocation>;