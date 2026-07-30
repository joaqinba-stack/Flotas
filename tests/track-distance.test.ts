import { describe, it, expect } from "vitest";
import { haversineKm, summarizeTrack, fmtDuration } from "@/lib/telemetry/distance";

const BASE = new Date("2026-07-24T03:00:00Z").getTime();
function t(segundos: number): string {
  return new Date(BASE + segundos * 1000).toISOString();
}

describe("haversineKm", () => {
  it("mide una distancia conocida en Asunción", () => {
    // Un grado de latitud son ~111,2 km en cualquier meridiano.
    expect(haversineKm(-25.28, -57.6, -25.28, -57.6)).toBe(0);
    expect(haversineKm(-25.0, -57.6, -26.0, -57.6)).toBeCloseTo(111.2, 0);
  });
});

describe("summarizeTrack", () => {
  it("sin puntos o con uno solo no hay recorrido", () => {
    expect(summarizeTrack([]).distanceKm).toBe(0);
    expect(
      summarizeTrack([{ latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 0 }])
        .distanceKm,
    ).toBe(0);
  });

  it("descarta la deriva del GPS con el equipo detenido", () => {
    // Caso real del 24/07: estacionado, velocidad 0, y el receptor saltando
    // cientos de metros de un fix al siguiente.
    const puntos = [
      { latitude: -25.278, longitude: -57.601, recordedAt: t(0), speedKmh: 0 },
      { latitude: -25.2805, longitude: -57.597, recordedAt: t(10), speedKmh: 0 },
      { latitude: -25.278, longitude: -57.601, recordedAt: t(20), speedKmh: 0 },
    ];
    const r = summarizeTrack(puntos);
    expect(r.distanceKm).toBe(0);
    expect(r.rawKm).toBeGreaterThan(0.9); // más de 900 m de deriva pura
    expect(r.discardedKm).toBeCloseTo(r.rawKm, 6);
  });

  it("cuenta el recorrido real cuando el equipo reporta marcha", () => {
    // ~1,11 km en 60 s → 66,7 km/h, plausible.
    const puntos = [
      { latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 60 },
      { latitude: -25.29, longitude: -57.6, recordedAt: t(60), speedKmh: 70 },
    ];
    const r = summarizeTrack(puntos);
    expect(r.distanceKm).toBeCloseTo(1.112, 2);
    expect(r.maxSpeedKmh).toBe(70);
    expect(r.movingSeconds).toBe(60);
  });

  it("descarta saltos que implicarían una velocidad imposible", () => {
    // 1,11 km en 2 s → 2.000 km/h: fix malo, aunque el equipo diga que se mueve.
    const puntos = [
      { latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 40 },
      { latitude: -25.29, longitude: -57.6, recordedAt: t(2), speedKmh: 40 },
    ];
    expect(summarizeTrack(puntos).distanceKm).toBe(0);
  });

  it("descarta el temblor por debajo del error del receptor", () => {
    // ~2 m entre fixes: ruido, no marcha lenta.
    const puntos = [
      { latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 6 },
      { latitude: -25.280018, longitude: -57.6, recordedAt: t(7), speedKmh: 6 },
    ];
    expect(summarizeTrack(puntos).distanceKm).toBe(0);
  });

  it("ordena por tiempo, así el histórico puede pasarlos al revés", () => {
    const asc = [
      { latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 60 },
      { latitude: -25.29, longitude: -57.6, recordedAt: t(60), speedKmh: 60 },
    ];
    const desc = [...asc].reverse();
    expect(summarizeTrack(desc).distanceKm).toBeCloseTo(summarizeTrack(asc).distanceKm, 9);
    expect(summarizeTrack(desc).firstAt?.toISOString()).toBe(t(0));
    expect(summarizeTrack(desc).lastAt?.toISOString()).toBe(t(60));
  });

  it("dos fixes con la misma marca de tiempo no aportan kilometraje", () => {
    const puntos = [
      { latitude: -25.28, longitude: -57.6, recordedAt: t(0), speedKmh: 60 },
      { latitude: -25.29, longitude: -57.6, recordedAt: t(0), speedKmh: 60 },
    ];
    expect(summarizeTrack(puntos).distanceKm).toBe(0);
  });
});

describe("fmtDuration", () => {
  it("formatea horas y minutos", () => {
    expect(fmtDuration(0)).toBe("—");
    expect(fmtDuration(90)).toBe("2 min");
    expect(fmtDuration(3600)).toBe("1 h 0 min");
    expect(fmtDuration(9300)).toBe("2 h 35 min");
  });
});
