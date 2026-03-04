import { notFound } from 'next/navigation'
import { getLocationAction } from '@/app/actions/locationActions'
import EditLocationForm from '@/app/components/EditLocationForm'

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const location = await getLocationAction(id)

  if (!location) {
    notFound()
  }

  return <EditLocationForm location={location} />
}
