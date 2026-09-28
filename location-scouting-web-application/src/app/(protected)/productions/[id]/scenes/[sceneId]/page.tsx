import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import { getCandidatesAction, scoreCandidatesAction } from '@/actions/candidateActions'
import { getLocationsAction } from '@/actions/locationActions'
import { formatSlugline } from '@/lib/format'
import PageHeader from '@/components/common/PageHeader'
import SceneDetailCard from '@/components/scenes/SceneDetailCard'
import SceneCandidatesSection from '@/components/scenes/SceneCandidatesSection'
import { toCandidateRow } from '@/components/candidates/toCandidateRow'

export default async function ViewScenePage({ params }: { params: Promise<{ id: string; sceneId: string }> }) {
    const { id: projectId, sceneId } = await params

    const [projectResult, sceneResult] = await Promise.all([getProject(projectId), getSceneAction(sceneId)])
    // The scene must belong to the production in the URL
    if (!projectResult.success || !sceneResult.success || sceneResult.data.projectId !== projectId) notFound()
    const project = projectResult.data
    const scene = sceneResult.data

    const [candidatesResult, locations, scoresResult] = await Promise.all([
        getCandidatesAction(sceneId),
        getLocationsAction(),
        scoreCandidatesAction(sceneId),
    ])
    if (!candidatesResult.success) throw new Error(candidatesResult.error)

    const candidates = candidatesResult.data
    const scores = scoresResult.success ? scoresResult.data : null
    const rows = candidates.map((candidate) => toCandidateRow(candidate, scores))
    // Only active locations can be added as candidates
    const pickableLocations = locations.filter((location) => location.status === 'ACTIVE')

    return (
        <>
            <PageHeader
                title={`Scene ${scene.sceneNumber} — ${formatSlugline(scene)}`}
                backHref={`/productions/${projectId}`}
                breadcrumbs={[project.name, 'Scenes', `Scene ${scene.sceneNumber}`]}
            />
            <SceneDetailCard scene={scene} />
            <SceneCandidatesSection
                rows={rows}
                locations={pickableLocations}
                candidatedLocationIds={candidates.map((candidate) => candidate.locationId)}
                sceneId={sceneId}
                projectId={projectId}
            />
        </>
    )
}
