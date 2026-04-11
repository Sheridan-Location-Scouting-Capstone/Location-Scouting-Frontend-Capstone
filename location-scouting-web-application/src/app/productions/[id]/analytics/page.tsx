import {getProject} from "@/app/actions/productionActions";
import {notFound} from "next/navigation";
import {Box, Button, Typography} from "@mui/material";
import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const KEYWORD_DISTRIBUTION_LIMIT = 10

export default async function ProjectAnalyticsPage({
    params,
                                                   } : {
    params: Promise<{ id: string }>
}) {
    const { id: projectId } = await params

    const projectResult = await getProject(projectId)
    if(!projectResult.success) notFound()

    const project = projectResult.data

    const [summaryResult, pointsResult, coverageResult, gapsResult, distributionResult] = await Promise.all([
        getAnalyticsSummary(projectId),
        getLocationPoints(projectId),
        getSceneCoverage(projectId),
        getKeywordGaps(projectId),
        getKeywordDistribution(projectId, KEYWORD_DISTRIBUTION_LIMIT)
    ])

    const summary = summaryResult.success
        ? summaryResult.data
        : { totalScenes: 0, intCount: 0, extCount: 0, intExtCount: 0, scenesWithCandidates: 0, scenesWithSelected: 0, uniqueKeywords: 0, matchedKeywords: 0, unmatchedKeywords: 0 }
    const locationPoints = pointsResult.success ? pointsResult.data : []
    const sceneCoverage = coverageResult.success
        ? coverageResult.data
        : { selected: 0, candidateOnly: 0, noCandidates: 0 }
    const keywordGaps = gapsResult.success ? gapsResult.data : []
    const keywordDistribution = distributionResult.success ? distributionResult.data : []

    return (
        <Box>
            {/*Navigation*/}
            <Box sx={{ display: flex, alignItems: 'center', gap: 2, mb: 1}}>
                <Link href={`/productions/${projectId}`} style={{ textDecoration: 'none' }}>
                    <Button startIcon={<ArrowBackIcon />} variant = "outlined" size = "small">
                        Back
                    </Button>
                </Link>
                <Typography variant="body2" color="text.secondary">
                    {project.name}
                    <Box component="span" sx={{mx : 1}}>/</Box>
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        Analytics
                    </Box>
                </Typography>
            </Box>

            {/*Page Title*/}
            <Typography variant="h4" sx={{ mb: 3 }}>
                Production analytics
            </Typography>

            {/* Client dashboard receives all pre-fetched data */}
            <AnalyticsDashboard
        </Box>
    )

}