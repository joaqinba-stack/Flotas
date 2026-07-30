// Kilometraje recorrido a partir de posiciones crudas.
//
// Sumar la distancia entre posiciones consecutivas sin filtrar NO da el
// kilometraje: da el kilometraje más la deriva del GPS. Medido sobre el
// historial real del VPS, entre el 16 % y el 18 % de la suma cruda de cada
// vehículo es deriva acumulada con el equipo detenido. En el peor día
// (ROQUE, 24/07/2026) la suma cruda daba 50,8 km contra ~35,8 km reales.
//
// Tampoco sirve `odometerKm` (el `totalDistance` de Traccar): Traccar lo calcula
// sumando la misma distancia entre fixes, así que arrastra idéntica deriva —
// en ese día daba 50,90 km, prácticamente igual que la suma cruda.
//
// De ahí los tres descartes de abajo. Cada uno responde a algo visto en los
// datos, no a una precaución teórica.

/** Debajo de esta velocidad se considera que el equipo dice "no me moví". */
const DETENIDO_KMH = 1;

/**
 * Piso de desplazamiento por tramo. El error típico de un receptor GPS urbano
 * es de varios metros, y con reportes cada ~7 s un tramo de menos de 10 m
 * implicaría menos de 5 km/h sostenidos: es ruido, no marcha.
 */
const PISO_METROS = 10;

/**
 * Techo de velocidad implícita. Por encima el tramo es un fix malo que
 * "teletransporta" el punto y vuelve: en el 24/07 hubo saltos de 600 m en 10 s
 * (238 km/h implícitos) con el vehículo estacionado.
 */
const TECHO_KMH = 160;

const RADIO_TIERRA_KM = 6371;

export type TrackSample = {
  latitude: number;
  longitude: number;
  recordedAt: Date | string;
  speedKmh: number;
};

export type TrackSummary = {
  /** Posiciones consideradas. */
  points: number;
  /** Kilometraje después de descartar deriva y saltos imposibles. */
  distanceKm: number;
  /** Suma cruda de todos los tramos, sin filtrar. */
  rawKm: number;
  /** rawKm - distanceKm: lo que se descartó por ruido. */
  discardedKm: number;
  /** Máxima velocidad reportada por el equipo en el rango. */
  maxSpeedKmh: number;
  /** Segundos entre posiciones con el vehículo en marcha. */
  movingSeconds: number;
  firstAt: Date | null;
  lastAt: Date | null;
};

export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Resume un recorrido. Acepta los puntos en cualquier orden —el histórico los
 * trae del más reciente al más antiguo— y ordena una copia por tiempo.
 */
export function summarizeTrack(samples: TrackSample[]): TrackSummary {
  const vacio: TrackSummary = {
    points: samples.length,
    distanceKm: 0,
    rawKm: 0,
    discardedKm: 0,
    maxSpeedKmh: 0,
    movingSeconds: 0,
    firstAt: null,
    lastAt: null,
  };
  if (samples.length === 0) return vacio;

  const ordenados = [...samples].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  let distanceKm = 0;
  let rawKm = 0;
  let movingSeconds = 0;
  let maxSpeedKmh = 0;

  for (const p of ordenados) {
    if (p.speedKmh > maxSpeedKmh) maxSpeedKmh = p.speedKmh;
  }

  for (let i = 1; i < ordenados.length; i++) {
    const previo = ordenados[i - 1];
    const actual = ordenados[i];
    const km = haversineKm(previo.latitude, previo.longitude, actual.latitude, actual.longitude);
    rawKm += km;

    const segundos =
      (new Date(actual.recordedAt).getTime() - new Date(previo.recordedAt).getTime()) / 1000;

    // 1. El equipo reporta velocidad cero en los dos extremos: no se movió,
    //    lo que cambió es la lectura del receptor.
    const quieto = previo.speedKmh < DETENIDO_KMH && actual.speedKmh < DETENIDO_KMH;
    if (quieto) continue;

    // 2. Desplazamiento por debajo del error del receptor.
    if (km * 1000 < PISO_METROS) continue;

    // 3. Salto imposible. Un dt no positivo (dos fixes con la misma marca de
    //    tiempo) entra acá: no se puede validar la velocidad, así que se descarta.
    if (segundos <= 0 || km / (segundos / 3600) > TECHO_KMH) continue;

    distanceKm += km;
    movingSeconds += segundos;
  }

  return {
    points: ordenados.length,
    distanceKm,
    rawKm,
    discardedKm: rawKm - distanceKm,
    maxSpeedKmh,
    movingSeconds,
    firstAt: new Date(ordenados[0].recordedAt),
    lastAt: new Date(ordenados[ordenados.length - 1].recordedAt),
  };
}

/** "2 h 35 min" — para la columna de tiempo en marcha del cuadro de kilometraje. */
export function fmtDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h === 0) return `${min} min`;
  return `${h} h ${min} min`;
}
