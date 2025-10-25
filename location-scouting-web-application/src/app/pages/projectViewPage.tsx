import { randomInt } from "crypto";
import Link from "next/link";
import { projects } from "../data/project";

function getProjectById(id: string): ProjectSchema | undefined {
    const numericId = parseInt(id);
    console.log(`Project id wtv ${id}`)
    return projects.find(project => project.id === numericId);
}

export default function ProjectViewPage({ id }: {  id: string }) {
    console.log(`received id ${id}`)
    const project = getProjectById(id);

    const locations = project?.locations;
    const scenes = project?.scenes;

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div>
            <Link href={`/`}>
                {"<-"} Go Back                 
            </Link>
            <div >
                <div className="text-2xl p-5 col-span-1">Project view page</div>
                <div className="p-5">Name: {project.name}</div>
                <div className="pl-7">Locations:</div>
                <ul className="pl-9 pb-5">
                    {locations?.map(location=>
                        <li className="pt-2" key={location.id}>
                            <div>Name: {location.name}</div>
                            <div>City: {location.city},{location.province}</div>
                        </li>
                    )}
                </ul>
                <div className="pl-7">Scenes:</div> 
                <ul className="pl-9 pb-5">
                    {scenes?.map(scene=> (
                    <li className="pt-2" key={scene.id}>
                        Heading: {scene.sceneHeading}
                    </li>))}
                </ul>
            </div>
        </div>
        
    );
}