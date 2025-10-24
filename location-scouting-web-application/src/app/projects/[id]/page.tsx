import ProjectViewPage from "@/app/pages/projectViewPage";


export default async function ProjectDetailsPage({ params }: { params: { id: string } }) {
    const {id} = await params; // note: ID must be accessed asyncronously because it's passed through a URL
    return <ProjectViewPage id={id} />
}