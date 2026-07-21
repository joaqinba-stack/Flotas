"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

export type HistoryPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number;
  isBuffered: boolean;
};

export function HistoryMap({ points }: { points: HistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (points.length === 0) {
        // Asunción, Paraguay
        map.setView([-25.2637, -57.5759], 11);
        return;
      }
      const latlngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
      L.polyline(latlngs, { color: "#1a5fb4", weight: 3 }).addTo(map);
      const first = points[points.length - 1];
      const last = points[0];
      L.circleMarker([first.latitude, first.longitude], { radius: 7, color: "#26732d", fillColor: "#fff", fillOpacity: 1 })
        .bindTooltip("Inicio")
        .addTo(map);
      L.circleMarker([last.latitude, last.longitude], { radius: 7, color: "#c01c28", fillColor: "#fff", fillOpacity: 1 })
        .bindTooltip("Fin")
        .addTo(map);
      map.fitBounds(latlngs, { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  return <div ref={containerRef} className="map-container" style={{ height: "50vh" }} />;
}
