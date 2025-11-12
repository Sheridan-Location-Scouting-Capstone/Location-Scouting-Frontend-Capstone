'use client'

import { useRouter } from "next/navigation"
import Link from "next/link";
import { sceneLocations } from "@/app/data/sceneLocations";
import { locations } from "@/app/data/location";
import { env } from "process";
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

export function getLocationsForScene(sceneId: number): LocationSchema[] {
  const locationIdsForScene = sceneLocations
    .filter(sl => sl.sceneId === sceneId)
    .map(sl => sl.locationId); // ❗️this was sceneId before

  return locations.filter(loc => locationIdsForScene.includes(loc.id));
}


const handleAddLocation = (id:number) => {
    console.log("Add location to a scene (Test):", id);
}

// add another return that mentions numbers of matches (maybe a struct)
// struct contains:  listof(location, rank)
export function getSuggestedLocations(
  sceneKeywords: string[],
  allLocations: LocationSchema[],
  sceneId: number
): LocationSchema[] {
    const locationsInScene = getLocationsForScene(sceneId);
    const excludedIds = new Set(locationsInScene.map(l => l.id));

    const normalizedKeywords = sceneKeywords
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

    if (normalizedKeywords.length === 0) return [];

    const scored = allLocations
        .filter(loc => !excludedIds.has(loc.id)) // exclude already-linked
        .map(loc => {
        const text = [
            loc.name,
            loc.city,
            loc.address,
            loc.province,
            ...(loc.locationKeywords ?? []),
        ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

        const score = normalizedKeywords.reduce(
        (count, kw) => (text.includes(kw) ? count + 1 : count), 0);

        return { loc, score };
    });


    return scored
        .filter(x => x.score > 0) 
        .sort((a, b) => b.score - a.score)
        .map(x => x.loc);
}

export function SceneDetailView({ scene }: { scene: SceneSchema }) {
    const router = useRouter();

    const sceneId = scene.id;
    const sceneKeywords = scene.locationKeywords;
    const locationsInScene = getLocationsForScene(sceneId);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    const suggestedLocations = getSuggestedLocations(
        sceneKeywords,
        locations, 
        sceneId
    );

    return (
    <div className="grid grid-cols-[1fr_500px]">
        <div> {/*col1 */}
        <button onClick={() => router.back()} className="pb-5">
            {"<-"} Go Back
        </button>

        <div className="text-2xl p-1 bg-amber-300 text-black">
            Heading: {scene.sceneHeading}
        </div>

        <div className="p-2">Scene Script:</div>
        <p className="p-3 overflow-y-auto">{scene.scriptSection}</p>

        <div className="p-2">Locations:</div>
        <ul className="pl-3 pb-5">
            {locationsInScene.map(location => (
            <li className="pt-2" key={location.id}>
                <Link className="bg-amber-400" href={`/locations/${location.id}`}>
                <div className="p-1">
                    <div>Name: {location.name}</div>
                    <div>
                        City: {location.city}, {location.province}
                    </div>
                </div>
                </Link>
            </li>
            ))}
        </ul>

        <div className="p-2">
            Location Keywords: <div className="p-1 text-blue-500">{scene.locationKeywords.join(", ")}</div>
        </div>

            {suggestedLocations.length > 0 && (
                <div className="p-2">
                    Suggested Locations:
                    <ul className="pl-3 pb-5">
                    {suggestedLocations.map(location => (
                        <li
                            key={location.id}
                            className="pt-2 grid grid-cols-[1fr_100px] items-center gap-2"
                        >
                            <Link className="" href={`/locations/${location.id}`}>
                            <div className="p-1">
                                <div>Name: {location.name}</div>
                                <div>
                                Address: {location.address}, {location.city},{" "}
                                {location.province}
                                </div>
                                <div>
                                    Location Keywords: {scene.locationKeywords.join(", ")}
                                </div>
                            </div>
                            </Link>

                            <button
                            type="button"
                            className="px-2 py-1 bg-blue-600 rounded"
                            // hook this up to your add-to-scene handler:
                            onClick={() => handleAddLocation(location.id)}
                            >
                            Add
                            </button>
                        </li>
                        ))}
                    </ul>
                </div>
            )}
        </div> {/*end col1 */}
        <div className="">
            <APIProvider apiKey={apiKey}>
                <Map zoom={12} center={{ lat: 43.6532, lng: -79.3832 }} style={{ width: "100%", height: "100%" }}>
                    <Marker position={{ lat: 43.6532, lng: -79.3832 }} />
                </Map>
            </APIProvider>
        </div>
    </div>
    );
}
