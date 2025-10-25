import { scenes } from "../data/scenes";

export function ScenesPage() {
    const sceneslist: SceneSchema[] = [];

    
    const listItems = scenes.map(scene =>
        <li key={scene.id} className="p-10 bg-gray-800 mb-5">
            <div>{scene.scriptSection}</div>
        </li>
    );
    // do we need a scenes page?
    return (
        <div className="grid grid-rows-[50px_1fr] h-full">
            <div className="text-2xl col-span-1" >
                Scenes
            </div>
            <div className="overflow-y-auto">
                {/* <ul>{scenes}</ul> */}
                Unsure if we need a scenes page?
            </div>
        </div>
    );
}