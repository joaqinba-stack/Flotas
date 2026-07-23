"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, CircleMarker } from "leaflet";

type VehiclePosition = {
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

type DriverPosition = {
  driverId: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  recordedAt: string;
  isBuffered: boolean;
  driver: {
    firstName: string;
    lastName: string;
    status: string;
    device: { connectionStatus: string } | null;
  };
};

type StreamPayload = { vehicles: VehiclePosition[]; drivers: DriverPosition[] };

// Asunción, Paraguay
const DEFAULT_CENTER: [number, number] = [-25.2637, -57.5759];

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let source: EventSource | null = null;
    const vehicleMarkers = new Map<string, CircleMarker>();
    const driverMarkers = new Map<string, CircleMarker>();
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
        const { vehicles, drivers }: StreamPayload = JSON.parse(event.data);
        const allPoints: Array<[number, number]> = [];

        for (const p of vehicles) {
          allPoints.push([p.latitude, p.longitude]);
          const online = p.vehicle.traccarDevice?.connectionStatus === "ONLINE";
          const popup = `<strong>${p.vehicle.plate}</strong><br/>` +
            `${p.vehicle.currentDriver ? `${p.vehicle.currentDriver.lastName}, ${p.vehicle.currentDriver.firstName}<br/>` : ""}` +
            `${p.speedKmh} km/h — ${new Date(p.recordedAt).toLocaleString("es-AR")}` +
            `${p.isBuffered ? "<br/><em>Dato reconciliado offline</em>" : ""}`;
          const existing = vehicleMarkers.get(p.vehicleId);
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
            vehicleMarkers.set(p.vehicleId, marker);
          }
        }

        // Conductores (celular con Traccar Client): mismo estilo de punto,
        // pero relleno sólido en vez de hueco, para distinguirlos de un vistazo
        // de las unidades sin depender de íconos externos.
        for (const p of drivers) {
          allPoints.push([p.latitude, p.longitude]);
          const online = p.driver.device?.connectionStatus === "ONLINE";
          const color = online ? "#2d7d46" : "#c01c28";
          const popup = `<strong>${p.driver.lastName}, ${p.driver.firstName}</strong><br/>` +
            `${p.speedKmh} km/h — ${new Date(p.recordedAt).toLocaleString("es-AR")}` +
            `${p.isBuffered ? "<br/><em>Dato reconciliado offline</em>" : ""}`;
          const existing = driverMarkers.get(p.driverId);
          if (existing) {
            existing.setLatLng([p.latitude, p.longitude]);
            existing.setStyle({ color, fillColor: color });
            existing.setPopupContent(popup);
          } else {
            const marker = L.circleMarker([p.latitude, p.longitude], {
              radius: 6,
              weight: 2,
              color,
              fillColor: color,
              fillOpacity: 0.9,
            }).addTo(map);
            marker.bindTooltip(`${p.driver.firstName} ${p.driver.lastName}`, {
              permanent: true,
              direction: "top",
              offset: [0, -8],
            });
            marker.bindPopup(popup);
            driverMarkers.set(p.driverId, marker);
          }
        }

        if (!fitted && allPoints.length > 0) {
          fitted = true;
          map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 14 });
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
