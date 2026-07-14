// Motor de validación de cargas de combustible (requisito #7 del pliego).
// Los umbrales son configurables porque las reglas finas las define el área de
// operaciones del cliente (riesgo abierto #4 del plan).

export type FuelLoadCandidate = {
  liters: number;
  odometerKm: number;
  loadedAt: Date;
  fuelType: string;
};

export type PreviousLoad = {
  loadedAt: Date;
  liters: number;
  odometerKm: number;
};

export type FuelValidationContext = {
  tankCapacityLiters: number | null;
  vehicleFuelType: string;
  previousLoads: PreviousLoad[]; // más recientes primero
};

export type FuelValidationThresholds = {
  duplicateWindowMinutes: number;
  sameAmountWindowHours: number;
  sameAmountToleranceLiters: number;
  minHoursBetweenLoads: number;
  minKmBetweenLoads: number;
  maxKmJumpBetweenLoads: number;
};

export const DEFAULT_THRESHOLDS: FuelValidationThresholds = {
  duplicateWindowMinutes: 30,
  sameAmountWindowHours: 2,
  sameAmountToleranceLiters: 0.5,
  minHoursBetweenLoads: 4,
  minKmBetweenLoads: 20,
  maxKmJumpBetweenLoads: 1500,
};

export const FUEL_FLAGS = {
  EXCEEDS_TANK_CAPACITY: "EXCEEDS_TANK_CAPACITY",
  DUPLICATE_SUSPECT: "DUPLICATE_SUSPECT",
  SAME_AMOUNT_RECENT: "SAME_AMOUNT_RECENT",
  ODOMETER_REGRESSION: "ODOMETER_REGRESSION",
  ODOMETER_JUMP: "ODOMETER_JUMP",
  TOO_SOON_AFTER_PREVIOUS: "TOO_SOON_AFTER_PREVIOUS",
  FUEL_TYPE_MISMATCH: "FUEL_TYPE_MISMATCH",
  FUTURE_DATE: "FUTURE_DATE",
} as const;

export const FUEL_FLAG_LABELS: Record<string, string> = {
  EXCEEDS_TANK_CAPACITY: "Litros superan la capacidad del tanque",
  DUPLICATE_SUSPECT: "Posible carga duplicada (misma unidad en ventana corta)",
  SAME_AMOUNT_RECENT: "Misma cantidad de litros que una carga reciente",
  ODOMETER_REGRESSION: "Odómetro menor al de una carga anterior",
  ODOMETER_JUMP: "Salto de odómetro anómalo desde la carga anterior",
  TOO_SOON_AFTER_PREVIOUS: "Carga demasiado próxima a la anterior (tiempo y km)",
  FUEL_TYPE_MISMATCH: "Tipo de combustible distinto al del vehículo",
  FUTURE_DATE: "Fecha de carga en el futuro",
};

export function validateFuelLoad(
  candidate: FuelLoadCandidate,
  ctx: FuelValidationContext,
  thresholds: FuelValidationThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date(),
): { flags: string[]; status: "VALID" | "FLAGGED" } {
  const flags: string[] = [];
  const t = thresholds;

  if (candidate.loadedAt.getTime() > now.getTime() + 60_000) {
    flags.push(FUEL_FLAGS.FUTURE_DATE);
  }

  if (ctx.tankCapacityLiters !== null && candidate.liters > ctx.tankCapacityLiters) {
    flags.push(FUEL_FLAGS.EXCEEDS_TANK_CAPACITY);
  }

  if (candidate.fuelType !== ctx.vehicleFuelType) {
    flags.push(FUEL_FLAGS.FUEL_TYPE_MISMATCH);
  }

  const prev = ctx.previousLoads[0];
  if (prev) {
    const hoursSincePrev = Math.abs(candidate.loadedAt.getTime() - prev.loadedAt.getTime()) / 3_600_000;
    const kmSincePrev = candidate.odometerKm - prev.odometerKm;

    if (hoursSincePrev * 60 <= t.duplicateWindowMinutes) {
      flags.push(FUEL_FLAGS.DUPLICATE_SUSPECT);
    }
    if (
      hoursSincePrev <= t.sameAmountWindowHours &&
      Math.abs(candidate.liters - prev.liters) <= t.sameAmountToleranceLiters &&
      !flags.includes(FUEL_FLAGS.DUPLICATE_SUSPECT)
    ) {
      flags.push(FUEL_FLAGS.SAME_AMOUNT_RECENT);
    }
    if (
      hoursSincePrev < t.minHoursBetweenLoads &&
      kmSincePrev >= 0 &&
      kmSincePrev < t.minKmBetweenLoads &&
      !flags.includes(FUEL_FLAGS.DUPLICATE_SUSPECT)
    ) {
      flags.push(FUEL_FLAGS.TOO_SOON_AFTER_PREVIOUS);
    }
    if (kmSincePrev > t.maxKmJumpBetweenLoads) {
      flags.push(FUEL_FLAGS.ODOMETER_JUMP);
    }
  }

  const maxPrevOdometer = ctx.previousLoads.reduce((max, p) => Math.max(max, p.odometerKm), 0);
  if (ctx.previousLoads.length > 0 && candidate.odometerKm < maxPrevOdometer) {
    flags.push(FUEL_FLAGS.ODOMETER_REGRESSION);
  }

  return { flags, status: flags.length > 0 ? "FLAGGED" : "VALID" };
}
