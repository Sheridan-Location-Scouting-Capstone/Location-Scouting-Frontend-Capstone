import { Alert } from '@mui/material'
import { getProject } from '@/actions/productionActions'
import { getProductionAnalyticsAction } from '@/actions/analyticsActions'
import PageHeader from '@/components/common/PageHeader'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { unwrapForPage } from '@/lib/pageResult'

const KEYWORD_DISTRIBUTION_LIMIT = 10

export default async function ProjectAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    const project = unwrapForPage(await getProject(projectId))

    const analyticsResult = await getProductionAnalyticsAction(projectId, KEYWORD_DISTRIBUTION_LIMIT)

    return (
        <>
            <PageHeader
                title="Production analytics"
                backHref={`/productions/${projectId}`}
                breadcrumbs={[project.name, 'Analytics']}
            />
            {analyticsResult.success ? (
                <AnalyticsDashboard analytics={analyticsResult.data} />
            ) : (
                <Alert severity="error">Analytics couldn&apos;t be loaded: {analyticsResult.error}</Alert>
            )}
        </>
    )
}
