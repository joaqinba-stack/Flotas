import type { TraccarPosition } from "./client";

export type NormalizedPosition = {
  traccarPositionId: bigint;
  latitude: number;
  longitude: number;
  speedKmh: number;
  course: number | null;
  ignition: boolean | null;
  odometerKm: number | null;
  recordedAt: Date;
  receivedAt: Date;
  isBuffered: boolean;
  attributes: Record<string, unknown>;
};

export function bufferedGapSeconds(): number {
  const raw = Number(process.env.TRACCAR_BUFFERED_GAP_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 120;
}

// Traccar reporta velocidad en nudos y distancia acumulada en metros.
export function normalizePosition(raw: TraccarPosition, receivedAt = new Date()): NormalizedPosition {
  const recordedAt = new Date(raw.fixTime ?? raw.deviceTime ?? raw.serverTime ?? receivedAt);
  const attrs = raw.attributes ?? {};
  const totalDistance = typeof attrs.totalDistance === "number" ? attrs.totalDistance : null;
  const gapSeconds = (receivedAt.getTime() - recordedAt.getTime()) / 1000;

  return {
    traccarPositionId: BigInt(raw.id),
    latitude: raw.latitude,
    longitude: raw.longitude,
    speedKmh: Math.round(raw.speed * 1.852 * 10) / 10,
    course: typeof raw.course === "number" ? raw.course : null,
    ignition: typeof attrs.ignition === "boolean" ? attrs.ignition : null,
    odometerKm: totalDistance !== null ? Math.round(totalDistance / 100) / 10 : null,
    recordedAt,
    receivedAt,
    isBuffered: gapSeconds > bufferedGapSeconds(),
    attributes: attrs,
  };
}
