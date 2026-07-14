"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

type LivePosition = {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  recordedAt: string;
  isBuffered: boolean;
  vehicle: {
    plate: string;
    status: string;
    currentDriver: { firstName: string; lastName: string } | null;
    traccarDevice: { connectionStatus: string } | null;
  };
};

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let source: EventSource | null = null;
    const markers = new Map<string, CircleMarker>();
    let fitted = false;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current).setView(DEFAULT_CENTER, 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      source = new EventSource("/api/positions/stream");
      source.onmessage = (event) => {
        if (!map) return;
        const positions: LivePosition[] = JSON.parse(event.data);
        for (const p of positions) {
          const online = p.vehicle.traccarDevice?.connectionStatus === "ONLINE";
          const popup = `<strong>${p.vehicle.plate}</strong><br/>` +
            `${p.vehicle.currentDriver ? `${p.vehicle.currentDriver.lastName}, ${p.vehicle.currentDriver.firstName}<br/>` : ""}` +
            `${p.speedKmh} km/h — ${new Date(p.recordedAt).toLocaleString("es-AR")}` +
            `${p.isBuffered ? "<br/><em>Dato reconciliado offline</em>" : ""}`;
          const existing = markers.get(p.vehicleId);
          if (existing) {
            existing.setLatLng([p.latitude, p.longitude]);
            existing.setStyle({ color: online ? "#1a5fb4" : "#c01c28" });
            existing.setPopupContent(popup);
          } else {
            const marker = L.circleMarker([p.latitude, p.longitude], {
              radius: 8,
              weight: 2,
              color: online ? "#1a5fb4" : "#c01c28",
              fillColor: "#ffffff",
              fillOpacity: 0.9,
            }).addTo(map);
            marker.bindTooltip(p.vehicle.plate, { permanent: true, direction: "top", offset: [0, -8] });
            marker.bindPopup(popup);
            markers.set(p.vehicleId, marker);
          }
        }
        if (!fitted && positions.length > 0) {
          fitted = true;
          map.fitBounds(
            positions.map((p) => [p.latitude, p.longitude] as [number, number]),
            { padding: [40, 40], maxZoom: 14 },
          );
        }
      };
    });

    return () => {
      cancelled = true;
      source?.close();
      map?.remove();
    };
  }, []);

  return <div ref={containerRef} className="map-container" />;
}
