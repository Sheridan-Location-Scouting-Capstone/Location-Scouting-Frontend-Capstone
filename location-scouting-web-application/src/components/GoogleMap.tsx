'use client'

import { APIProvider, Map, Marker, useMapsLibrary  } from "@vis.gl/react-google-maps";
import { LocationRow } from "./LocationTable";
import {useEffect, useState} from "react";

function GeocodedMarker({ location, onCoordsFound }: { location: LocationRow, onCoordsFound: (coords: {lat: number, lng: number}) => void }) {
  const geocodingLib = useMapsLibrary("geocoding");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!geocodingLib) return;

    const fullAddress = `${location.address}, ${location.city}, ${location.postalCode}, ${location.country}`;
    const geocoder = new geocodingLib.Geocoder();
    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const { lat, lng } = results[0].geometry.location;
        const found = { lat: lat(), lng: lng() };
        setCoords(found);
        onCoordsFound(found);
      }
    });
  }, [geocodingLib, location]);

  return coords ? <Marker position={coords} /> : null;
}

export function GoogleMap(location: LocationRow) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 43.45, lng: -80.49 });

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: "100%", height: "400px" }}
          center={center}
          defaultZoom={14}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        >
          <GeocodedMarker location={location} onCoordsFound={setCenter} />
        </Map>
      </APIProvider>
    </div>
  );
}