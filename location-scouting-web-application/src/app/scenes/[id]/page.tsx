import { scenes } from "@/app/data/scenes";
import { SceneDetailView } from "./sceneDetailView";

export default async function SceneViewServer({ params }: { params: Promise<{ id: string }> }) {

    const {id} = await params;
    const scene = scenes.find(s => s.id === parseInt(id))

    if(!scene){
        return <div>Scene does not exist.</div>
    }

    return <SceneDetailView scene={scene} />
}