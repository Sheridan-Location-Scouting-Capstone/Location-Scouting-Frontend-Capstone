'use client'

import { randomInt } from "crypto";
import Link from "next/link";
import { projects } from "../../data/project";
import { useRouter } from "next/navigation";
import { projectLocations } from "@/app/data/projectLocations";
import { locations } from "@/app/data/location";
import { scenes } from "@/app/data/scenes";
import { sceneLocations } from "@/app/data/sceneLocations";


function getProjectById(id: string): ProjectSchema | undefined {
    const numericId = parseInt(id);
    console.log(`Project id wtv ${id}`)
    return projects.find(project => project.id === numericId);
}

export function getLocationsForProject(projectId: number) {
  const locationIds = projectLocations
    .filter(pl => pl.projectId === projectId)
    .map(pl => pl.locationId);
  
  return locations.filter(loc => locationIds.includes(loc.id));
}

// might use this to split up the way photos are displayed and arranged, but might not be necessary here
export function getScenesForLocation(locationId: number) {
  const sceneIds = sceneLocations
    .filter(sl => sl.locationId === locationId)
    .map(sl => sl.sceneId);
  
  return scenes.filter(scene => sceneIds.includes(scene.id));
}

export default function ProjectDetailsPage({ id }: {  id: string }) {
    console.log(`received id ${id}`)

    const idNum = parseInt(id);

    const router = useRouter();

    const project = getProjectById(id);

    const locations = getLocationsForProject(idNum);
    const scenesList = scenes.find(s => s.projectId === idNum);

    if (!project) {
        return <div>Project not found</div>;
    }

    return (
        <div>
            <button onClick={()=>router.back()}>
                {"<-"} Go Back                 
            </button>
            <div >
                <div className="text-2xl p-5 col-span-1">Project view page</div>
                <div className="p-5">Name: {project.name}</div>
                <div className="pl-7">Locations:</div>
                <ul className="pl-9 pb-5">
                    {locations?.map(location=>
                        <li className="pt-2" key={location.id}>
                            <Link href={`/locations/${location.id}`} >
                                <div>Name: {location.name}</div>
                                <div>City: {location.city},{location.province}</div>
                            </Link>
                        </li>
                    )}
                </ul>
                <div className="pl-7">Scenes:</div> 
                <ul className="pl-9 pb-5">
                    {scenes?.map(scene=> (
                    <li className="pt-2" key={scene.id}>
                        <Link href={`/scenes/${scene.id}`} >
                            Heading: {scene.sceneHeading}
                        </Link>
                    </li>))}
                </ul>
            </div>
        </div>
        
    );
}