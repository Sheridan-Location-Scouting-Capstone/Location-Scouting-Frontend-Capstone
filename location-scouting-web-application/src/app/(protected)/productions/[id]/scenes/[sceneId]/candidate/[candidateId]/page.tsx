import { notFound } from 'next/navigation'
import { getProject, getSceneAction } from '@/actions/productionActions'
import { getCandidateAction } from '@/actions/candidateActions'
import { unwrapForPage } from '@/lib/pageResult'
import PageHeader from '@/components/common/PageHeader'

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
        getCandidateAction(candidateId),
    ])
    const project = unwrapForPage(projectResult)
    const scene = unwrapForPage(sceneResult)
    const candidate = unwrapForPage(candidateResult)
    // The candidate must belong to the scene, and the scene to the production, named in the URL
    if (scene.projectId !== projectId || candidate.sceneId !== sceneId) notFound()

    return (
        <PageHeader
            title={`Scene ${scene.sceneNumber} - Candidate`}
            backHref={`/productions/${projectId}/scenes/${sceneId}`}
            breadcrumbs={[project.name, 'Scenes', `Scene ${scene.sceneNumber}`, 'Candidate']}
        />
    )
}
