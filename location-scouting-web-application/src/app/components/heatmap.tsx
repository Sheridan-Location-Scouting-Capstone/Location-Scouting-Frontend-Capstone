import { useEffect, useRef } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

type HeatPoint = { lat: number; lng: number; weight?: number };

interface HeatmapProps {
  points: HeatPoint[];
}

export function Heatmap({ points }: HeatmapProps) {
  const map = useMap();
  const visualization = useMapsLibrary("visualization");
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !visualization) return;
    const google = window.google;

    const data = points.map((p) =>
      p.weight != null
        ? { location: new google.maps.LatLng(p.lat, p.lng), weight: p.weight }
        : new google.maps.LatLng(p.lat, p.lng)
    );

    if (!heatmapRef.current) {
      heatmapRef.current = new visualization.HeatmapLayer({
        map,
        data,
        radius: 30, 
        opacity: 0.7,   
      });
    } else {
      heatmapRef.current.setData(data as any);
    }

    return () => {
      heatmapRef.current?.setMap(null);
      heatmapRef.current = null;
    };
  }, [map, visualization, points]);

  return null;
}
