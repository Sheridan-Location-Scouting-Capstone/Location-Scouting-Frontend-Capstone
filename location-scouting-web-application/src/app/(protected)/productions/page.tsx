import AddIcon from '@mui/icons-material/Add'
import { getProjectsAction } from '@/actions/productionActions'
import PageHeader from '@/components/common/PageHeader'
import LinkButton from '@/components/common/LinkButton'
import ProductionGrid from '@/components/productions/ProductionGrid'
import { unwrapForPage } from '@/lib/pageResult'

export default async function ProductionsPage() {
    const projects = unwrapForPage(await getProjectsAction())

    return (
        <>
            <PageHeader
                title="Productions"
                actions={
                    <LinkButton href="/productions/new" variant="contained" startIcon={<AddIcon />} size="large">
                        Create New Production
                    </LinkButton>
                }
            />
            <ProductionGrid projects={projects} />
        </>
    )
}
