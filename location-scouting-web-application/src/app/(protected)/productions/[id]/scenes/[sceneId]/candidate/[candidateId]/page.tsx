import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import {getCandidateAction, getCandidateWithLocationAction} from '@/actions/candidateActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import {getLocationAction} from "@/actions/locationActions";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Chip from "@mui/material/Chip"
import {Brightness1Rounded, Slideshow} from "@mui/icons-material";
import {alpha, Box, Button} from "@mui/material";
import StatusChip from "@/components/candidates/StatusChip";
import LinkButton from "@/components/common/LinkButton";
import PresentationMode from "@/components/common/PresentationMode"

// Candidate detail is still a stub: it only confirms the candidate exists and shows which scene it's for
export default async function CandidateDetailPage({
    params,
}: {
    params: Promise<{ id: string; sceneId: string; candidateId: string }>
}) {
    const { id: projectId, sceneId, candidateId } = await params

    const [projectResult, sceneResult, candidateResult] = await Promise.all([
        getProject(projectId),
        getSceneAction(sceneId),
        getCandidateWithLocationAction(candidateId),
    ])
    const project = unwrapForPage(projectResult)
    const scene = unwrapForPage(sceneResult)
    const candidate = unwrapForPage(candidateResult)
    // The candidate must belong to the scene, and the scene to the production, named in the URL
    if (scene.projectId !== projectId || candidate.sceneId !== sceneId) notFound()

    return (
        <PageHeader
            title={`${candidate.location.name}`}
            subTitle={`${candidate.location.address}, ${candidate.location.city}, ${candidate.location.province}`}
            titleAdornment={
                candidate.selected && (
                    <StatusChip label="Selected" datatest-id="candidate-selected-chip" />
                )
            }
            backHref={`/productions/${projectId}/scenes/${sceneId}`}
            breadcrumbs={[ project.name, 'Scenes', `Scene ${scene.sceneNumber}`, `Candidate`]}
            actions={
                <>
                    <LinkButton href={`/locations/${candidate.location.id}`} variant="outlined" data-testid="view-candidate-button-view-location">
                        View Location
                    </LinkButton>
                    <PresentationMode photos={
                        candidate.photos.map
                        (cp => ({
                            url: cp.photo.url,
                            title: `${cp.name ?? cp.photo.name ?? candidate.location.name ?? ''}`,
                            description: `${candidate.location.address}, ${candidate.location.city}\n${scene.sceneLocation}`,
                            alt: cp.name ?? cp.photo.name ?? undefined })
                        )}
                    />
                </>
            }


        />


    )
}
