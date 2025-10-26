import ProjectViewPage from "@/app/projects/[id]/projectDetailsPage";


export default async function ProjectDetailsPageServer({ params }: { params: { id: string } }) {
    const {id} = await params; // note: ID must be accessed asyncronously because it's passed through a URL
    return <ProjectViewPage id={id} />
}