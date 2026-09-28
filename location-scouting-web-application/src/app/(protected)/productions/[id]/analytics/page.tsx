import { notFound } from 'next/navigation'
import { Alert } from '@mui/material'
import { getProject } from '@/actions/productionActions'
import { getProductionAnalyticsAction } from '@/actions/analyticsActions'
import PageHeader from '@/components/common/PageHeader'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

const KEYWORD_DISTRIBUTION_LIMIT = 10

export default async function ProjectAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    const projectResult = await getProject(projectId)
    if (!projectResult.success) notFound()

    const analyticsResult = await getProductionAnalyticsAction(projectId, KEYWORD_DISTRIBUTION_LIMIT)

    return (
        <>
            <PageHeader
                title="Production analytics"
                backHref={`/productions/${projectId}`}
                breadcrumbs={[projectResult.data.name, 'Analytics']}
            />
            {analyticsResult.success ? (
                <AnalyticsDashboard analytics={analyticsResult.data} />
            ) : (
                <Alert severity="error">Analytics couldn&apos;t be loaded: {analyticsResult.error}</Alert>
            )}
        </>
    )
}
