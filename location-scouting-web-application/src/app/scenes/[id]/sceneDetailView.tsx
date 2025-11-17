'use client'

import { useRouter } from "next/navigation"
import Link from "next/link";
import { useState } from "react";
import { sceneLocations } from "@/app/data/sceneLocations";
import { locations } from "@/app/data/location";
import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { Heatmap } from "@/app/components/heatmap";

export function getLocationsForScene(sceneId: number): LocationSchema[] {
  const locationIdsForScene = sceneLocations
    .filter(sl => sl.sceneId === sceneId)
    .map(sl => sl.locationId);

  return locations.filter(loc => locationIdsForScene.includes(loc.id));
}

const handleAddLocation = (id:number) => {
  console.log("Add location to a scene (Test):", id);
}

export function getSuggestedLocations(
  sceneKeywords: string[],
  allLocations: LocationSchema[],
  sceneId: number
): { loc: LocationSchema; score: number; rank: number }[] {
  const locationsInScene = getLocationsForScene(sceneId);
  const excludedIds = new Set(locationsInScene.map(l => l.id));

  const normalizedKeywords = sceneKeywords
    .map(k => k.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedKeywords.length === 0) return [];

  const scored = allLocations
    .filter(loc => !excludedIds.has(loc.id))
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
        (count, kw) => (text.includes(kw) ? count + 1 : count),
        0
      );

      return { loc, score };
    });

  const sorted = scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export function SceneDetailView({ scene }: { scene: SceneSchema }) {
  const router = useRouter();
  const [showMobileMap, setShowMobileMap] = useState(false); // NEW

  const sceneId = scene.id;
  const sceneKeywords = scene.locationKeywords;
  const locationsInScene = getLocationsForScene(sceneId);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  type HeatPoint = { lat: number; lng: number; weight?: number };

  const heatPoints: HeatPoint[] = [
    { lat: 43.6532, lng: -79.3832, weight: 1 },
    { lat: 43.66,   lng: -79.40,   weight: 0.7 },
  ];

  const suggestedLocations = getSuggestedLocations(
    sceneKeywords,
    locations,
    sceneId
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_500px] sm:grid-cols-1">
      {/* LEFT COLUMN */}
      <div>
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
          Location Keywords:
          <div className="p-1 text-blue-500">
            {scene.locationKeywords.join(", ")}
          </div>
        </div>

        {suggestedLocations.length > 0 && (
          <div className="p-2">
            Suggested Locations:
            <ul className="pl-3 pb-5">
              {suggestedLocations.map(location => (
                <li
                  key={location.loc.id}
                  className="pt-2 grid grid-cols-[50px_1fr_100px] items-center gap-2"
                >
                  <div>{location.rank}</div>
                  <Link href={`/locations/${location.loc.id}`}>
                    <div className="p-1">
                      <div>Name: {location.loc.name}</div>
                      <div>
                        Address: {location.loc.address}, {location.loc.city},{" "}
                        {location.loc.province}
                      </div>
                      <div>
                        Location Keywords: {scene.locationKeywords.join(", ")}
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                    onClick={() => handleAddLocation(location.loc.id)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mobile: button to open map modal */}
        <div className="mt-4 lg:hidden">
          <button
            className="px-2 py-1 bg-blue-600 text-white rounded"
            onClick={() => setShowMobileMap(true)} // NEW
          >
            Show map
          </button>
        </div>
      </div>

      {/* desktop map (only lg+) */}
      <div className="hidden lg:block h-[500px]">
        <APIProvider apiKey={apiKey}>
          <Map
            zoom={12}
            center={{ lat: 43.6532, lng: -79.3832 }}
            style={{ width: "100%", height: "100%" }}
          >
            <Heatmap points={heatPoints} />
          </Map>
        </APIProvider>
      </div>

      {/* mobile map modal */}
      {showMobileMap && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 flex items-center justify-center">
          <div className="relative w-full h-full max-w-3xl max-h-[90vh] bg-white">
            {/* close button */}
            <button
              className="absolute top-3 right-3 px-2 py-1 bg-gray-800 text-white rounded"
              onClick={() => setShowMobileMap(false)}
            >
              Close
            </button>

            <div className="w-full h-full pt-10">
              <APIProvider apiKey={apiKey}>
                <Map
                  zoom={12}
                  center={{ lat: 43.6532, lng: -79.3832 }}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Heatmap points={heatPoints} />
                </Map>
              </APIProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
