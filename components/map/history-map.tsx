"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { fmtDateTimeSeconds, fmtNumber } from "@/lib/format";

export type HistoryPoint = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  speedKmh: number;
  isBuffered: boolean;
};

// Un rastro por dispositivo: la pantalla de Histórico puede pedir toda la flota
// y cada vehículo tiene que dibujarse como una línea propia, no como una sola
// polilínea que salte de un vehículo a otro.
export type HistoryTrack = {
  id: string;
  label: string;
  /** Ordenados del más reciente al más antiguo (como vienen del repositorio). */
  points: HistoryPoint[];
};

const TRACE_COLOR = "#1a5fb4";

function pointTooltip(track: HistoryTrack, p: HistoryPoint, withLabel: boolean): string {
  const cuando = fmtDateTimeSeconds(p.recordedAt);
  const velocidad = `${fmtNumber(p.speedKmh, 1)} km/h`;
  const encabezado = withLabel ? `<strong>${track.label}</strong><br/>` : "";
  const buffer = p.isBuffered ? "<br/><em>Buffer offline</em>" : "";
  return `${encabezado}${cuando}<br/>${velocidad}${buffer}`;
}

export function HistoryMap({ tracks }: { tracks: HistoryTrack[] }) {
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

      const conPuntos = tracks.filter((t) => t.points.length > 0);
      if (conPuntos.length === 0) {
        // Asunción, Paraguay
        map.setView([-25.2637, -57.5759], 11);
        return;
      }

      // Con un solo dispositivo el nombre en cada tooltip es ruido: ya está en
      // el título de la pantalla.
      const withLabel = conPuntos.length > 1;
      const todos: Array<[number, number]> = [];

      for (const track of conPuntos) {
        const latlngs = track.points.map((p) => [p.latitude, p.longitude] as [number, number]);
        todos.push(...latlngs);
        L.polyline(latlngs, { color: TRACE_COLOR, weight: 3 }).addTo(map!);

        for (const p of track.points) {
          L.circleMarker([p.latitude, p.longitude], {
            radius: 4,
            color: TRACE_COLOR,
            weight: 1,
            fillColor: "#fff",
            fillOpacity: 1,
          })
            .bindTooltip(pointTooltip(track, p, withLabel), { direction: "top" })
            .addTo(map!);
        }

        // Los puntos vienen del más reciente al más antiguo: el inicio del
        // recorrido es el último del arreglo.
        const inicio = track.points[track.points.length - 1];
        const fin = track.points[0];
        L.circleMarker([inicio.latitude, inicio.longitude], {
          radius: 7,
          color: "#26732d",
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .bindTooltip(`Inicio${withLabel ? ` — ${track.label}` : ""}`)
          .addTo(map!);
        L.circleMarker([fin.latitude, fin.longitude], {
          radius: 7,
          color: "#c01c28",
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .bindTooltip(`Fin${withLabel ? ` — ${track.label}` : ""}`)
          .addTo(map!);
      }

      map.fitBounds(todos, { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [tracks]);

  return <div ref={containerRef} className="map-container" style={{ height: "50vh" }} />;
}
