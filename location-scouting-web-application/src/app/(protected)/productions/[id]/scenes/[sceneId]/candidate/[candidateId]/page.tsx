import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import {getCandidateWithLocationAction} from '@/actions/candidateActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'
import StatusChip from "@/components/candidates/StatusChip";
import LinkButton from "@/components/common/LinkButton";
import PresentationMode from "@/components/common/PresentationMode"
import 'yet-another-react-lightbox/styles.css';
import CandidateCarousel from "@/components/candidates/CandidateCarousel";
import {Grid, Stack} from "@mui/material"
import CandidateTravelStats from "@/components/candidates/CandidateTravelStats";

// TODO: Add side panels, keyword match panel, map, etc...
// Candidate detail is in progress
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

    return (<>
            <PageHeader
                title={`${candidate.location.name}`}
                subTitle={`${candidate.location.address}, ${candidate.location.city}, ${candidate.location.province}`}
                titleAdornment={
                    candidate.selected ? (
                        <StatusChip label='Selected' data-testid="candidate-selected-chip" />
                    ) : (
                        <StatusChip label='Candidate' color='warning' data-testid='candidate-chip' />
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
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <CandidateCarousel
                        photos={
                            candidate.photos.map(cp => ({
                                url: cp.photo.url,
                            }))
                        }
                    >
                    </CandidateCarousel>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Stack spacing={2}>
                        {/* TODO: Replace these hard-coded value with calculated values fetched from the backend*/}
                        <CandidateTravelStats
                            distanceMeters = { 4200 }
                            durationSeconds = { 5000 }
                        />
                    </Stack>
                </Grid>
            </Grid>
        </>
    )
}
