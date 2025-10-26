'use client'

import { useRouter } from "next/navigation"
import Link from "next/link";

export function SceneDetailView(scene: {scene : SceneSchema}) {
    const router = useRouter();

    return (
        <div>
            <button onClick={()=>router.back()}
                className="pb-5">
                {"<-"} Go Back                 
            </button>
            <div className="text-2xl p-1">Heading: {scene.scene.sceneHeading}</div>
            <div className="p-2">Location Keywords: {scene.scene.locationKeywords.map(l => l+" ")}</div>
            <div className="p-2">Script Section:</div>
            <p className="p-3 overflow-y-auto">
                {scene.scene.scriptSection}
            </p>
        </div>
    )

}