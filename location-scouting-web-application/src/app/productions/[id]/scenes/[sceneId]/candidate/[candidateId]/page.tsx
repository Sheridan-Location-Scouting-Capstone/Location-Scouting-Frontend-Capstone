import {getCandidateById} from "@/app/services/candidateService";
import {notFound} from "next/navigation";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getCandidateById(id)
    if(!result.success) notFound()

    const candidate = result.data

    return (
        <Box>

        </Box>
    )
}