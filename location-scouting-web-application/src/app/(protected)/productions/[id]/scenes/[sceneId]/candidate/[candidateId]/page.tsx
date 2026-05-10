import {getCandidateById} from "@/services/candidateService";
import {notFound} from "next/navigation";
import {Box, Typography} from "@mui/material";
import {getSceneById} from "@/services/sceneService";

export default async function CandidateDetailPage({ params }: { params: Promise<{ candidateId: string }> }) {
    const { candidateId } = await params
    const result = await getCandidateById(candidateId)
    if(!result.success) notFound()

    const candidate = result.data

    // @ts-ignore
    const sceneResult = await getSceneById(candidate.sceneId);
    const sceneNumber : number  = sceneResult.success ? sceneResult.data.sceneNumber : 0

    return (
        <Box>
            <Typography variant="h4" sx={{ mb : 1}}>
                Scene {sceneNumber} -
            </Typography>
        </Box>
    )
}