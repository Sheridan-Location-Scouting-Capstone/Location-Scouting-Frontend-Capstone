'use client'

import { useEffect, useRef, useMemo } from "react";
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import {LocationPoint} from "@/app/productions/[id]/analytics/analytics.types";

export type HeatPointType = {
  locationId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
};

export interface HeatmapProps {
  points: LocationPoint[];
}

const WEIGHT = 3;

function HeatmapLayer({ points }: HeatmapProps) {
  const map = useMap();
  const visualization = useMapsLibrary("visualization");
  
  const heatmapLayer = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const heatmapData = useMemo(() => {
    if (!visualization) return [];
    
    return points
      .filter((p) => p.latitude !== undefined && p.longitude !== undefined)
      .map((p) => ({
        location: new google.maps.LatLng(p.latitude!, p.longitude!),
        weight: WEIGHT,
      }));
  }, [points, visualization]);

  useEffect(() => {
    if (!map || !visualization) return;

    if (!heatmapLayer.current) {
      heatmapLayer.current = new visualization.HeatmapLayer({
        map,
        data: heatmapData,
        radius: 30,
        opacity: 0.7,
      });
    } else {
      heatmapLayer.current.setData(heatmapData);
    }

    return () => {
      if (heatmapLayer.current) {
        heatmapLayer.current.setMap(null);
        heatmapLayer.current = null;
      }
    };
  }, [map, visualization, heatmapData]);

  useEffect(() => {
    if (!map || points.length === 0) return;

    const validPoints = points.filter(
        (p) => p.latitude !== undefined && p.longitude !== undefined
    );
    if (validPoints.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    validPoints.forEach((p) => {
      bounds.extend({ lat: p.latitude!, lng: p.longitude! });
    });

    map.fitBounds(bounds, 60);

    // Clamp zoom for single-point case so it doesn't zoom in to street level
    if (validPoints.length === 1) {
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
        if ((map.getZoom() ?? 0) > 13) map.setZoom(13);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [map, points]);
  return null;
}

export function Heatmap({ points }: HeatmapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: "100%", height: "400px" }}
          defaultCenter={{ lat: 43.45, lng: -80.49 }}
          defaultZoom={10}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        >
          <HeatmapLayer points={points} />
        </Map>
      </APIProvider>
    </div>
  );
}