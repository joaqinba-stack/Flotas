"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
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
// Por encima de esto no se dibujan los puntos sueltos: la línea sola alcanza y
// el hover sigue funcionando igual, porque no depende de los marcadores.
const DOT_LIMIT = 2000;

function pointTooltip(track: HistoryTrack, p: HistoryPoint, withLabel: boolean): string {
  const encabezado = withLabel ? `<strong>${track.label}</strong><br/>` : "";
  const buffer = p.isBuffered ? "<br/><em>Buffer offline</em>" : "";
  return `${encabezado}${fmtDateTimeSeconds(p.recordedAt)}<br/>${fmtNumber(p.speedKmh, 1)} km/h${buffer}`;
}

// Búsqueda lineal del punto más cercano al cursor. Es O(n) por movimiento del
// mouse, pero solo corre mientras el puntero está sobre la línea y evita tener
// que crear un marcador con tooltip por cada posición: eso es lo que permite
// dibujar recorridos de decenas de miles de puntos sin arrastrar el navegador.
function nearestPoint(points: HistoryPoint[], lat: number, lng: number): HistoryPoint {
  let mejor = points[0];
  let mejorDist = Infinity;
  for (const p of points) {
    const dLat = p.latitude - lat;
    const dLng = p.longitude - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < mejorDist) {
      mejorDist = dist;
      mejor = p;
    }
  }
  return mejor;
}

export function HistoryMap({ tracks }: { tracks: HistoryTrack[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      // Canvas en vez de SVG: con miles de puntos, un nodo del DOM por punto es
      // la diferencia entre un mapa fluido y uno inusable.
      const mapa = L.map(containerRef.current, { preferCanvas: true });
      map = mapa;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapa);

      const conPuntos = tracks.filter((t) => t.points.length > 0);
      if (conPuntos.length === 0) {
        // Asunción, Paraguay
        mapa.setView([-25.2637, -57.5759], 11);
        return;
      }

      // Con un solo dispositivo, repetir su nombre en cada tooltip es ruido: ya
      // está en el filtro de la pantalla.
      const withLabel = conPuntos.length > 1;
      const todos: Array<[number, number]> = [];

      for (const track of conPuntos) {
        const latlngs = track.points.map((p) => [p.latitude, p.longitude] as [number, number]);
        todos.push(...latlngs);

        const linea = L.polyline(latlngs, { color: TRACE_COLOR, weight: 3 });
        linea.addTo(mapa);
        // Un único tooltip pegado al cursor, que se recalcula al moverse sobre
        // la línea.
        linea.bindTooltip("", { sticky: true, direction: "top" });
        const mostrarPunto = (e: LeafletMouseEvent) => {
          const p = nearestPoint(track.points, e.latlng.lat, e.latlng.lng);
          linea.setTooltipContent(pointTooltip(track, p, withLabel));
        };
        // También en mouseover: si solo se escuchara mousemove, al entrar a la
        // línea se abriría un tooltip vacío hasta el primer movimiento.
        linea.on("mouseover", mostrarPunto);
        linea.on("mousemove", mostrarPunto);

        if (track.points.length <= DOT_LIMIT) {
          for (const p of track.points) {
            L.circleMarker([p.latitude, p.longitude], {
              radius: 3,
              color: TRACE_COLOR,
              weight: 1,
              fillColor: "#fff",
              fillOpacity: 1,
              interactive: false, // el hover lo maneja la línea
            }).addTo(mapa);
          }
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
          .addTo(mapa);
        L.circleMarker([fin.latitude, fin.longitude], {
          radius: 7,
          color: "#c01c28",
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .bindTooltip(`Fin${withLabel ? ` — ${track.label}` : ""}`)
          .addTo(mapa);
      }

      mapa.fitBounds(todos, { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [tracks]);

  return <div ref={containerRef} className="map-container" style={{ height: "60vh" }} />;
}
