import { describe, it, expect } from "vitest";
import { estimateSupplyNeed } from "@/lib/validation/trip-planning";

const NOW = new Date("2026-07-15T12:00:00Z");

describe("estimateSupplyNeed", () => {
  it("sin historial no hay riesgo", () => {
    const r = estimateSupplyNeed([], NOW);
    expect(r.supplyRisk).toBe(false);
    expect(r.avgLitersPerLoad).toBe(null);
  });

  it("con una sola carga no calcula intervalo ni riesgo", () => {
    const r = estimateSupplyNeed([{ loadedAt: new Date("2026-07-10T00:00:00Z"), liters: 40 }], NOW);
    expect(r.avgIntervalDays).toBe(null);
    expect(r.supplyRisk).toBe(false);
    expect(r.daysSinceLastLoad).toBeCloseTo(5.5, 0);
  });

  it("marca riesgo cuando el tiempo desde la última carga supera el patrón habitual", () => {
    const samples = [
      { loadedAt: new Date("2026-06-01T00:00:00Z"), liters: 40 },
      { loadedAt: new Date("2026-06-06T00:00:00Z"), liters: 42 },
      { loadedAt: new Date("2026-06-11T00:00:00Z"), liters: 41 },
    ];
    const r = estimateSupplyNeed(samples, NOW);
    expect(r.avgIntervalDays).toBeCloseTo(5, 0);
    expect(r.supplyRisk).toBe(true);
  });

  it("no marca riesgo dentro del patrón habitual", () => {
    const samples = [
      { loadedAt: new Date("2026-07-10T00:00:00Z"), liters: 40 },
      { loadedAt: new Date("2026-07-05T00:00:00Z"), liters: 42 },
      { loadedAt: new Date("2026-06-30T00:00:00Z"), liters: 41 },
    ];
    const r = estimateSupplyNeed(samples, NOW);
    expect(r.supplyRisk).toBe(false);
  });
});
