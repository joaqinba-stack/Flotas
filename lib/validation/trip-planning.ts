// Heurística simple de planificación de insumos a partir del histórico de
// cargas de combustible: sin telemetría de consumo real por modelo, se estima
// a partir del propio patrón de carga del vehículo.

export type FuelLoadSample = { loadedAt: Date; liters: number };

export type SupplyEstimate = {
  avgLitersPerLoad: number | null;
  avgIntervalDays: number | null;
  daysSinceLastLoad: number | null;
  supplyRisk: boolean;
};

const RISK_MULTIPLIER = 1.5;

export function estimateSupplyNeed(samples: FuelLoadSample[], now: Date): SupplyEstimate {
  if (samples.length === 0) {
    return { avgLitersPerLoad: null, avgIntervalDays: null, daysSinceLastLoad: null, supplyRisk: false };
  }
  const sorted = [...samples].sort((a, b) => b.loadedAt.getTime() - a.loadedAt.getTime());
  const avgLitersPerLoad = sorted.reduce((sum, s) => sum + s.liters, 0) / sorted.length;
  const daysSinceLastLoad = (now.getTime() - sorted[0].loadedAt.getTime()) / 86_400_000;

  if (sorted.length < 2) {
    return { avgLitersPerLoad, avgIntervalDays: null, daysSinceLastLoad, supplyRisk: false };
  }

  const intervalsDays: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    intervalsDays.push((sorted[i].loadedAt.getTime() - sorted[i + 1].loadedAt.getTime()) / 86_400_000);
  }
  const avgIntervalDays = intervalsDays.reduce((sum, d) => sum + d, 0) / intervalsDays.length;
  const supplyRisk = avgIntervalDays > 0 && daysSinceLastLoad > avgIntervalDays * RISK_MULTIPLIER;

  return { avgLitersPerLoad, avgIntervalDays, daysSinceLastLoad, supplyRisk };
}
